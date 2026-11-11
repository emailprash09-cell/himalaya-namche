"""Tile PNGs into one sheet with captions. Usage: python tile.py out.png cols a.png b.png ..."""
import sys
from PIL import Image, ImageDraw
out, cols, files = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
ims = [Image.open(f).convert('RGB') for f in files]
w = max(i.width for i in ims); h = max(i.height for i in ims) + 22
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (w * cols, h * rows), (235, 238, 242)); d = ImageDraw.Draw(sheet)
for k, (f, im) in enumerate(zip(files, ims)):
    x, y = (k % cols) * w, (k // cols) * h
    sheet.paste(im, (x, y + 22)); d.text((x + 6, y + 5), __import__('os').path.basename(f), fill=(30, 40, 50))
sheet.save(out); print(out, sheet.size)
