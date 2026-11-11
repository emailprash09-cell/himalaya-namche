import json, numpy as np, cv2, base64, io, math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
from PIL import Image
from scipy import ndimage

LAT0,LON0,MLAT,MLON=27.8050,86.7100,110816.0,98541.0
M=np.load(ROOT/'data'/'merged.npy')
def xz(c): return ((c[0]-LON0)*MLON, -(c[1]-LAT0)*MLAT)
def elev(x,z,o=3):
    lat=LAT0-np.asarray(z,float)/MLAT; lon=LON0+np.asarray(x,float)/MLON
    return ndimage.map_coordinates(M,[np.atleast_1d((29-lat)*1200).ravel(),np.atleast_1d((lon-86)*1200).ravel()],order=o)

gj=json.load(open(ROOT/'data'/'raw'/'namche-osm.geojson',encoding='utf-8'))
feats=gj['features']

# ---------- town box, aligned to DEM grid ----------
DX,DZ=MLON/1200,MLAT/1200
lonA,lonB=LON0-18000/MLON, LON0+27000/MLON
latA,latB=LAT0-16000/MLAT, LAT0+27000/MLAT
C0=int(np.floor((lonA-86)*1200)); C1=int(np.ceil((lonB-86)*1200))
R0=int(np.floor((29-latB)*1200)); R1=int(np.ceil((29-latA)*1200))
sub=M[R0:R1+1, C0:C1+1]; nz,nx=sub.shape
X0=(86+C0/1200-LON0)*MLON; Z0=-(29-R0/1200-LAT0)*MLAT
dem_b64=base64.b64encode(np.round(sub).astype('<i2').tobytes()).decode()

TXa,TXb,TZa,TZb=-900.0,1100.0,-1160.0,700.0
tc0=int(np.floor((TXa-X0)/DX)); tc1=int(np.ceil((TXb-X0)/DX))
tr0=int(np.floor((TZa-Z0)/DZ)); tr1=int(np.ceil((TZb-Z0)/DZ))
BX0,BX1=X0+tc0*DX, X0+tc1*DX
BZ0,BZ1=Z0+tr0*DZ, Z0+tr1*DZ
print('town box', round(BX0),round(BX1),round(BZ0),round(BZ1),'cells',tc1-tc0,tr1-tr0)

# ---------- mask raster ----------
PX=2.0
MW=int((BX1-BX0)/PX); MH=int((BZ1-BZ0)/PX)
# T1b: pixel i is centred at BX0+(i+0.5)*PX, which is how game.js samples the masks (ms(), inside()).
# The old code drew pixel i centred at BX0+i*PX, so every mask landed 1 m off in x and z.
# Drawing now uses OpenCV sub-pixel coordinates (SH fractional bits) in the game's convention.
SH=4
def toPx(x,z): return ((np.asarray(x)-BX0)/PX-0.5, (np.asarray(z)-BZ0)/PX-0.5)
def ipts(ring):
    a=np.array([toPx(p[0],p[1]) for p in ring],np.float64)
    return (a*(1<<SH)).round().astype(np.int32)
def FILL(img,ring,v=255): cv2.fillPoly(img,[ipts(ring)],v,cv2.LINE_8,SH)
def LINE(img,pts,thick,v=255): cv2.polylines(img,[ipts(pts)],False,v,max(1,int(thick)),cv2.LINE_8,SH)
print('mask',MW,MH)

paved=np.zeros((MH,MW),np.uint8); dirt=np.zeros((MH,MW),np.uint8)
water=np.zeros((MH,MW),np.uint8); wood=np.zeros((MH,MW),np.uint8)
scrub=np.zeros((MH,MW),np.uint8); rockm=np.zeros((MH,MW),np.uint8)
grass=np.zeros((MH,MW),np.uint8); walkseed=np.zeros((MH,MW),np.uint8)

BLD=[];PATHS=[];STREAM=[];POI=[];WALLS=[];HELI=[]
CORE=(-430,640,-430,420)   # dense town core for paved streets
def incore(pts):
    xs=[p[0] for p in pts]; zs=[p[1] for p in pts]
    return (max(xs)>CORE[0] and min(xs)<CORE[1] and max(zs)>CORE[2] and min(zs)<CORE[3])

for f in feats:
    p=f.get('properties',{}); g=f['geometry']; t=g['type']
    if 'building' in p and t in ('Polygon','MultiPolygon'):
        rings=g['coordinates'] if t=='Polygon' else g['coordinates'][0]
        ring=[xz(c) for c in rings[0]]
        if len(ring)>2 and ring[0]==ring[-1]: ring=ring[:-1]
        if len(ring)<3: continue
        BLD.append((ring,p))
    elif p.get('highway') in ('path','steps','footway','track','pedestrian') and t=='LineString':
        pts=[xz(c) for c in g['coordinates']]
        PATHS.append((pts,p.get('highway'),p.get('width')))
    elif ('waterway' in p) and t=='LineString':
        STREAM.append(([xz(c) for c in g['coordinates']], p.get('waterway')))
    elif p.get('natural')=='water' and t=='Polygon':
        FILL(water,[xz(c) for c in g['coordinates'][0]])
    elif p.get('natural') and t=='Polygon':
        tgt={'wood':wood,'scrub':scrub,'rock':rockm,'grassland':grass}.get(p['natural'])
        if tgt is not None: FILL(tgt,[xz(c) for c in g['coordinates'][0]])
    elif p.get('barrier')=='wall' and t in ('LineString','Polygon'):
        cs=g['coordinates'] if t=='LineString' else g['coordinates'][0]
        WALLS.append([xz(c) for c in cs])
    elif p.get('aeroway')=='helipad' and t=='Polygon':
        ring=[xz(c) for c in g['coordinates'][0]]
        HELI.append((ring,p))
    elif t=='Point':
        POI.append((xz(g['coordinates']), p))

# attach POI point tags to the building polygon that contains them
BPOLY=[np.array(r,np.float32).reshape(-1,1,2) for r,_ in BLD]
for (px,pz),pp in POI:
    if not (pp.get('tourism') or pp.get('amenity') or pp.get('shop')): continue
    for i,poly in enumerate(BPOLY):
        if cv2.pointPolygonTest(poly,(float(px),float(pz)),False)>=0:
            tg=BLD[i][1]
            for k,v in pp.items():
                if k not in tg or k=='name': tg[k]=v
            break

# ---------- buildings ----------
rng=np.random.default_rng(7)
def kind_of(p):
    n=(p.get('name') or '').lower()
    if p.get('building')=='monastery' or p.get('amenity') in ('monastery','place_of_worship') or 'gompa' in n: return 'gompa'
    if p.get('tourism')=='museum' or 'museum' in n or 'संग्रहालय' in (p.get('name') or ''): return 'museum'
    if p.get('amenity')=='school' or 'विद्यालय' in (p.get('name') or '') or 'school' in n: return 'school'
    if p.get('building')=='hospital' or p.get('amenity') in ('hospital','clinic','doctors') or 'स्वास्थ्य' in (p.get('name') or ''): return 'civic'
    if p.get('tourism') in ('guest_house','hotel') or p.get('building')=='hotel' or any(k in n for k in ('lodge','hotel','guest','inn','resort','home')): return 'lodge'
    if p.get('amenity') in ('restaurant','cafe','bar','pub','bank','pharmacy') or 'shop' in p or any(k in n for k in ('cafe','bakery','restaurant','bar')): return 'shop'
    return 'house'
def simplify(ring,tol=0.7):
    a=np.array(ring,np.float32).reshape(-1,1,2)
    s=cv2.approxPolyDP(a,tol,True)[:,0,:]
    if len(s)<3: s=np.array(ring,np.float32)
    if len(s)>14:
        s=cv2.approxPolyDP(a,1.6,True)[:,0,:]
    return s
def obb(pts):
    (cx,cy),(w,h),ang=cv2.minAreaRect(pts.astype(np.float32))
    a=math.radians(ang); ux,uz=math.cos(a),math.sin(a)
    if w<h: w,h=h,w; ux,uz=-uz,ux
    return cx,cy,w,h,ux,uz
ROOFW=[0.30,0.17,0.17,0.14,0.12,0.10]  # blue, teal, green, red, silver, darkgreen
WALLW=[0.42,0.28,0.16,0.14]            # stone, whitewash, wood, plaster
# ---------- T1a: resolve overlapping footprints ----------
# Overlap depth = width of the overlap region (2 x radius of its largest inscribed circle).
# Under 1.5 m: the smaller footprint is cut back to the shared edge (usually a simplification sliver).
# Over 1.5 m: the two footprints are merged into one outline, so the shared interior walls disappear.
from shapely.geometry import Polygon as SPoly
from shapely.ops import polylabel, unary_union
from shapely.strtree import STRtree
def ovl_depth(a,b):
    I=a.intersection(b)
    if I.is_empty or I.area<1e-4: return 0.0
    g=max(getattr(I,'geoms',[I]),key=lambda q:q.area)
    if g.geom_type!='Polygon' or g.area<1e-4: return 0.0
    return 2*polylabel(g,0.005).distance(g.exterior)
def largest(g):
    if g.is_empty: return None
    return max(getattr(g,'geoms',[g]),key=lambda q:q.area) if g.geom_type!='Polygon' else g
SIMP=[]   # [shapely polygon or None, [props...]] in source order
for ring,p in BLD:
    s=simplify(ring)
    if cv2.contourArea(s.astype(np.float32))<9: continue
    SIMP.append([SPoly(s.astype(float)).buffer(0),[p]])
def resolve_overlaps(items):
    shrunk=merged=0
    for _ in range(6):
        live=[k for k,it in enumerate(items) if it[0] is not None]
        tree=STRtree([items[k][0] for k in live]); changed=False
        for a_i,ka in enumerate(live):
            A=items[ka][0]
            if A is None: continue
            for b_i in tree.query(A):
                kb=live[b_i]
                if kb<=ka or items[kb][0] is None or items[ka][0] is None: continue
                A=items[ka][0]; Bp=items[kb][0]; d=ovl_depth(A,Bp)
                if d<=0: continue
                if d>1.5:
                    U=largest(unary_union([A,Bp]).buffer(0.01).buffer(-0.01))
                    items[ka]=[U,items[ka][1]+items[kb][1]]; items[kb]=[None,[]]; merged+=1
                else:
                    big,small=(ka,kb) if A.area>=Bp.area else (kb,ka)
                    cut=largest(items[small][0].difference(items[big][0].buffer(0.12)))
                    if cut is None or cut.area<4: cut=items[small][0]   # never delete a building
                    items[small][0]=cut.simplify(0.05); shrunk+=1
                changed=True
        if not changed: break
    return shrunk,merged
n_shr,n_mer=resolve_overlaps(SIMP)
FINAL=[(it[0],it[1]) for it in SIMP if it[0] is not None]
_tree=STRtree([f[0] for f in FINAL]); _maxd=0.0; _pairs=0
for i,(Pi,_) in enumerate(FINAL):
    for j in _tree.query(Pi):
        if j<=i: continue
        d=ovl_depth(Pi,FINAL[j][0])
        if d>0.0: _pairs+=1; _maxd=max(_maxd,d)
print('T1a footprints: shrunk',n_shr,'merged',n_mer,'| remaining overlapping pairs',_pairs,'max depth m',round(_maxd,3))
def merged_props(ps):
    if len(ps)==1: return ps[0]
    pr={'lodge':5,'gompa':6,'shop':4,'museum':3,'school':3,'civic':3,'house':1}
    best=max(ps,key=lambda q:pr[kind_of(q)]); out_p=dict(best)
    out_p['name']=' / '.join([q.get('name') for q in ps if q.get('name')])[:38] or best.get('name','')
    return out_p

out=[]
for poly,ps in FINAL:
    p=merged_props(ps)
    s=np.array(poly.exterior.coords[:-1],np.float32)
    cx,cz,w,h,ux,uz=obb(s)
    area=float(cv2.contourArea(s.astype(np.float32)))
    k=kind_of(p)
    base={'lodge':3,'shop':2,'house':2,'gompa':2,'museum':2,'school':2,'civic':2}[k]
    f=base+(1 if area>170 else 0)+(1 if area>420 and k in('lodge','shop') else 0)+(1 if rng.random()<0.3 else 0)
    if k in ('gompa',): f=2
    if k in ('school','civic','museum'): f=min(f,2)
    f=int(min(max(f,1),5))
    if area<36: f=1
    roof=int(rng.choice(6,p=ROOFW)); wall=int(rng.choice(4,p=WALLW))
    if k=='gompa': wall=1
    frame=int(rng.choice(4,p=[0.30,0.30,0.22,0.18]))
    bal=1 if (k in ('lodge','shop') and f>=3 and rng.random()<0.45) else 0
    pts=[[round(float(q[0]),2),round(float(q[1]),2)] for q in s]
    out.append(dict(p=pts,f=f,r=roof,w=wall,fr=frame,k=k,b=bal,
                    u=[round(ux,3),round(uz,3)],c=[round(float(cx),1),round(float(cz),1)],
                    d=[round(float(w),1),round(float(h),1)],n=(p.get('name') or '')[:38]))
_O=[SPoly(b['p']).buffer(0) for b in out]; _t=STRtree(_O)
_od=[ovl_depth(_O[i],_O[j]) for i in range(len(_O)) for j in _t.query(_O[i]) if j>i]
print('T1a check on written footprints: pairs overlapping',sum(1 for d in _od if d>0),'max depth m',round(max(_od+[0]),3))
print('buildings out',len(out),'kinds',{k:sum(1 for b in out if b['k']==k) for k in set(b['k'] for b in out)})

# ---------- T1b: keep path centre-lines 1.6 m clear of walls ----------
# OSM traces often clip a building corner. Each vertex nearer than 1.6 m to a footprint is moved
# straight away from the nearest wall. Segments that pass a wall get extra vertices first, so a
# segment cannot cut a corner between two clear vertices. Where two walls are closer than 3.2 m
# (a narrow alley) the vertex goes to the midpoint between them; those are counted as "tight".
from shapely.geometry import Point as SPt, LineString as SLine
from shapely.ops import nearest_points
CLEAR=1.6
BPS=[poly for poly,_ in FINAL]; BTREE=STRtree(BPS)
def near_polys(geom,r): return [BPS[k] for k in BTREE.query(geom.buffer(r))]
def densify(pts):
    out=[pts[0]]
    for a,b in zip(pts,pts[1:]):
        L=math.hypot(b[0]-a[0],b[1]-a[1]); seg=SLine([a,b])
        if L>1.0 and any(q.distance(seg)<CLEAR for q in near_polys(seg,CLEAR)):
            n=int(math.ceil(L/1.0))
            out+= [(a[0]+(b[0]-a[0])*k/n, a[1]+(b[1]-a[1])*k/n) for k in range(1,n)]
        out.append(b)
    return out
def push(q):
    x,z=q; moved=False
    for it in range(8):
        pt=SPt(x,z); cl=[(P.exterior.distance(pt),P) for P in near_polys(pt,CLEAR)]
        cl=[c for c in cl if c[0]<CLEAR-1e-3 or c[1].contains(pt)]
        if not cl: return (x,z),moved,False
        moved=True
        if it>=2:   # still not clear after two pushes, squeezed between walls: take the nearby spot with the most clearance
            q0=SPt(q); best=None
            for gx in np.arange(-2.0,2.01,0.1):
                for gz in np.arange(-2.0,2.01,0.1):
                    c=SPt(q[0]+gx,q[1]+gz)
                    if any(P.contains(c) for P in near_polys(c,CLEAR)): continue
                    m=min([min(P.exterior.distance(c),CLEAR) for P in near_polys(c,CLEAR)]+[CLEAR])
                    key=(round(m,2),-c.distance(q0))
                    if best is None or key>best[0]: best=(key,c)
            if best: return (best[1].x,best[1].y),True,best[0][0]<CLEAR-1e-3
            return (x,z),True,True
        d,P=min(cl,key=lambda c:c[0]); w=nearest_points(P.exterior,pt)[0]
        dx,dz=x-w.x,z-w.y; L=math.hypot(dx,dz) or 1e-6
        if P.contains(pt): dx,dz=-dx,-dz
        x,z=w.x+dx/L*(CLEAR+0.02),w.y+dz/L*(CLEAR+0.02)
    return (x,z),moved,True
_mv=0; _tight=0; _maxmv=0.0; _added=0
for i,(pts,kind,wtag) in enumerate(PATHS):
    xs=[q[0] for q in pts]; zs=[q[1] for q in pts]
    if max(xs)<BX0-50 or min(xs)>BX1+50 or max(zs)<BZ0-50 or min(zs)>BZ1+50: continue
    new=list(pts)
    for _pass in range(4):   # pushing neighbours apart can make the segment between them cut a corner: repeat
        dp=densify(new); _added+=len(dp)-len(new); new=[]; tg=0
        for q in dp:
            r,mv,tight=push(q)
            if mv: _mv+=1; _maxmv=max(_maxmv,math.hypot(r[0]-q[0],r[1]-q[1]))
            if tight: tg+=1
            new.append(r)
        if not any(P.distance(SLine([a,b]))==0 for a,b in zip(new,new[1:]) for P in near_polys(SLine([a,b]),0.1)): break
    _tight+=tg
    # final fix-up for a segment that still wraps a convex corner: add a vertex off that corner, on its outward bisector
    for _fix in range(3):
        out_pts=[new[0]]; fixed=False
        for a,b in zip(new,new[1:]):
            seg=SLine([a,b]); ins=[]
            for P in near_polys(seg,0.1):
                if P.distance(seg)>0: continue
                cs=list(P.exterior.coords)[:-1]; n=len(cs); ccw=P.exterior.is_ccw
                for k,v in enumerate(cs):
                    if seg.distance(SPt(v))>CLEAR: continue
                    pv,nv=cs[k-1],cs[(k+1)%n]
                    def onrm(u,w):
                        ex,ez=w[0]-u[0],w[1]-u[1]; L=math.hypot(ex,ez) or 1
                        return (ez/L,-ex/L) if ccw else (-ez/L,ex/L)
                    n1=onrm(pv,v); n2=onrm(v,nv); bx,bz=n1[0]+n2[0],n1[1]+n2[1]; L=math.hypot(bx,bz)
                    if L<1e-6: continue
                    best=None
                    for t in np.arange(0.1,CLEAR*1.05+1e-6,0.05):   # most clearance along the bisector (alleys can be narrow)
                        c=(v[0]+bx/L*t, v[1]+bz/L*t); cp=SPt(c); nb=near_polys(cp,CLEAR)
                        if any(Q.contains(cp) for Q in nb): continue
                        m=min([Q.exterior.distance(cp) for Q in nb]+[CLEAR])
                        if best is None or m>=best[0]-1e-9: best=(m,c)
                    if best: ins.append((seg.project(SPt(best[1])),best[1]))
            for _,c in sorted(ins): out_pts.append(c); fixed=True
            out_pts.append(b)
        new=out_pts
        if not fixed: break
    PATHS[i]=(new,kind,wtag)   # keep the inserted vertices: dropping them lets a segment cut a corner again
_left=0; _minc=99.0
for pts,kind,wtag in PATHS:
    for q in pts:
        pt=SPt(q); ds=[P.exterior.distance(pt) if not P.contains(pt) else -1 for P in near_polys(pt,CLEAR)]
        if ds: _minc=min(_minc,min(ds))
        if ds and min(ds)<CLEAR-0.05: _left+=1
print('T1b paths: vertices moved',_mv,'max move m',round(_maxmv,2),'tight alleys',_tight,'| still <1.6 m from a wall',_left,'min clearance m',round(_minc,2))
# rasterize paths
for pts,kind,wtag in PATHS:
    core=incore(pts)
    LINE(paved if core else dirt, pts, round((3.2 if core else 1.9)/PX))
    LINE(walkseed, pts, round(9/PX))
for pts,kind in STREAM:
    LINE(water, pts, round(2.4/PX))

bmask=np.zeros((MH,MW),np.uint8)
for poly,_ in FINAL:
    FILL(bmask,list(poly.exterior.coords))
walkseed=cv2.max(walkseed, cv2.dilate(bmask,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(int(16/PX)|1,int(16/PX)|1))))

walk=cv2.morphologyEx(walkseed,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(int(34/PX)|1,int(34/PX)|1)))
walk=ndimage.binary_fill_holes(walk>0).astype(np.uint8)*255
n,lab,st,_=cv2.connectedComponentsWithStats(walk,8)
walk=((lab==(1+np.argmax(st[1:,4])))*255).astype(np.uint8)
walk=cv2.GaussianBlur(walk,(0,0),2.0); walk=((walk>110)*255).astype(np.uint8)
print('walk area km2', round(walk.sum()/255*PX*PX/1e6,3))

def pack(chs):
    img=np.dstack(chs).astype(np.uint8)
    buf=io.BytesIO(); Image.fromarray(img,'RGBA').save(buf,'PNG',optimize=True)
    return base64.b64encode(buf.getvalue()).decode(), len(buf.getvalue())
# T1b: clip the blurred paved and dirt masks against every footprint grown by 0.4 m.
pavedB=cv2.GaussianBlur(paved,(0,0),0.8); dirtB=cv2.GaussianBlur(dirt,(0,0),0.8)
import shapely
_bad=0; _clipped=0
for poly,_ in FINAL:
    g=poly.buffer(0.4,join_style=2); x0,z0,x1,z1=g.bounds
    i0=max(0,int((x0-BX0)/PX)-1); i1=min(MW-1,int((x1-BX0)/PX)+1); j0=max(0,int((z0-BZ0)/PX)-1); j1=min(MH-1,int((z1-BZ0)/PX)+1)
    I,J=np.meshgrid(np.arange(i0,i1+1),np.arange(j0,j1+1))
    inn=shapely.contains_xy(g,BX0+(I+0.5)*PX,BZ0+(J+0.5)*PX)
    _clipped+=int(((pavedB[J,I]>0)|(dirtB[J,I]>0))[inn].sum())
    pavedB[J[inn],I[inn]]=0; dirtB[J[inn],I[inn]]=0
# independent re-check: every pixel centre inside any footprint (+0.4 m) must be zero in both masks
for poly,_ in FINAL:
    g=poly.buffer(0.4,join_style=2); x0,z0,x1,z1=g.bounds
    i0=max(0,int((x0-BX0)/PX)-1); i1=min(MW-1,int((x1-BX0)/PX)+1); j0=max(0,int((z0-BZ0)/PX)-1); j1=min(MH-1,int((z1-BZ0)/PX)+1)
    I,J=np.meshgrid(np.arange(i0,i1+1),np.arange(j0,j1+1))
    inn=shapely.contains_xy(g,BX0+(I+0.5)*PX,BZ0+(J+0.5)*PX)
    _bad+=int(((pavedB[J,I]>0)|(dirtB[J,I]>0))[inn].sum())
print('T1b mask clip: pixels cleared',_clipped,'| path-mask pixels left inside a footprint+0.4 m:',_bad)
m1,s1=pack([pavedB,dirtB,cv2.GaussianBlur(water,(0,0),0.6),np.full((MH,MW),255,np.uint8)])
bufw=io.BytesIO(); Image.fromarray(walk,'L').save(bufw,'PNG',optimize=True); m3=base64.b64encode(bufw.getvalue()).decode()
m2,s2=pack([cv2.GaussianBlur(wood,(0,0),2.0),cv2.GaussianBlur(scrub,(0,0),2.0),cv2.GaussianBlur(cv2.max(rockm,grass),(0,0),2.0),np.full((MH,MW),255,np.uint8)])
print('mask png',s1,s2)


# ---------- paths as polylines for geometry (stairs, edging) ----------
PP=[]
for pts,kind,wtag in PATHS:
    a=[[round(q[0],2),round(q[1],2)] for q in pts]
    if len(a)<2: continue
    xs=[q[0] for q in a]; zs=[q[1] for q in a]
    if max(xs)<BX0-50 or min(xs)>BX1+50 or max(zs)<BZ0-50 or min(zs)>BZ1+50: continue
    rec={'p':a,'s':1 if kind=='steps' else 0,'c':1 if incore(pts) else 0}
    try:
        if wtag: rec['w']=round(float(str(wtag).replace('m','').strip()),2)
    except ValueError: pass
    PP.append(rec)
WW=[[[round(q[0],1),round(q[1],1)] for q in w] for w in WALLS]
SS=[[[round(q[0],1),round(q[1],1)] for q in pts] for pts,_ in STREAM]
print('paths',len(PP),'walls',len(WW),'streams',len(SS))

# ---------- POIs ----------
def poi_kind(p):
    if p.get('aeroway')=='helipad': return 'helipad'
    if p.get('historic')=='wayside_shrine': return 'shrine'
    if p.get('historic')=='memorial': return 'memorial'
    if p.get('tourism')=='viewpoint': return 'viewpoint'
    if p.get('amenity')=='drinking_water': return 'water'
    if p.get('tourism')=='information': return 'info'
    return None
PO=[]
for (x,z),p in POI:
    k=poi_kind(p)
    if not k: continue
    PO.append({'x':round(x,1),'z':round(z,1),'k':k,'n':(p.get('name') or '')[:34]})
for ring,p in HELI:
    a=np.array(ring); PO.append({'x':round(float(a[:,0].mean()),1),'z':round(float(a[:,1].mean()),1),'k':'helipad','n':(p.get('name') or '')[:34],'r':round(float(np.hypot(a[:,0]-a[:,0].mean(),a[:,1]-a[:,1].mean()).max()),1)})
print('poi',len(PO), {k:sum(1 for q in PO if q['k']==k) for k in set(q['k'] for q in PO)})

peaks=[('Everest',8849,27.9883,86.9250),('Lhotse',8516,27.9617,86.9342),('Nuptse',7861,27.9675,86.8867),
 ('Ama Dablam',6812,27.8608,86.8617),('Thamserku',6623,27.7900,86.7850),('Kangtega',6782,27.7925,86.8167),
 ('Kongde Ri',6187,27.7933,86.6425),('Cholatse',6440,27.9200,86.7667)]
P=[]
for n,h,la,lo in peaks:
    x=(lo-LON0)*MLON; z=-(la-LAT0)*MLAT
    P.append(dict(n=n,h=h,x=round(x,1),z=round(z,1),y=round(float(elev(x,z)[0]),1)))

# spawn: on the main trail at the south-east entrance to town, facing up the street
def walk_at(x,z):
    px,pz=int(np.floor((x-BX0)/PX)),int(np.floor((z-BZ0)/PX))
    if px<0 or pz<0 or px>=MW or pz>=MH: return 0
    return walk[pz,px]
cands=[]
for pts,kind,wtag in PATHS:
    for q in pts:
        if 120<q[0]<620 and 180<q[1]<520 and walk_at(*q)>0: cands.append(q)
sp=min(cands,key=lambda q:-(q[1]))if cands else (300.0,300.0)
lm={'spawn':[round(sp[0],1),round(sp[1],1)],'face':[60.0,-40.0],
    'view':[523.2,270.2],'ridge':[58.7,-880.5],'gompa':None}
for b in out:
    if b['k']=='gompa': lm['gompa']=b['c']; break
data=dict(dem=dict(nx=int(nx),nz=int(nz),x0=X0,z0=Z0,dx=DX,dz=DZ,b64=dem_b64),
          town=dict(c0=tc0,c1=tc1,r0=tr0,r1=tr1),
          mask=dict(w=MW,h=MH,px=PX,x0=BX0,z0=BZ0,a=m1,b=m2,c=m3),
          buildings=out, paths=PP, walls=WW, streams=SS, poi=PO, peaks=P, lm=lm,
          geo=dict(lat0=LAT0,lon0=LON0,mlat=MLAT,mlon=MLON))
js='window.NAMCHE='+json.dumps(data,separators=(',',':'))+';'
open(ROOT/'data'/'data.js','w',encoding='utf-8').write(js)
print('data.js',len(js),'spawn',lm['spawn'],'gompa',lm['gompa'])
