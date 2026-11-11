// M2.5 ambience, all synthesised with Web Audio (no sample files): mountain wind, flapping prayer flags, the
// stream (louder near water), distant chatter (louder near people), yak bells on the yak trains (spatial), and
// a monastery horn (dungchen) now and then. Starts on the first click or key press (browsers require it).
import * as THREE from 'three/webgpu';

export interface Ambience { update(dt: number, listener: THREE.Camera, ctx: AmbienceInputs): void }
export interface AmbienceInputs { yaks: THREE.Vector3[]; peopleNear: number; streamDist: number }

function noiseBuffer(ac: AudioContext, seconds: number, brown: boolean): AudioBuffer {
  const b = ac.createBuffer(1, ac.sampleRate * seconds, ac.sampleRate);
  const d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
  }
  return b;
}

export function startAmbience(): Ambience {
  let ac: AudioContext | null = null;
  let wind: GainNode, flagsG: GainNode, streamG: GainNode, chatterG: GainNode, master: GainNode;
  const bells: { panner: PannerNode; next: number }[] = [];
  let nextHorn = 25;
  let clock = 0;

  const init = () => {
    if (ac) return;
    try { ac = new AudioContext(); } catch { return; }
    master = ac.createGain(); master.gain.value = 0.7; master.connect(ac.destination);
    const loop = (buf: AudioBuffer) => { const s = ac!.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); return s; };
    const brown = noiseBuffer(ac, 6, true), white = noiseBuffer(ac, 4, false);
    // Wind: brown noise, low-passed, slowly gusting.
    wind = ac.createGain(); wind.gain.value = 0.35;
    const wl = ac.createBiquadFilter(); wl.type = 'lowpass'; wl.frequency.value = 500;
    loop(brown).connect(wl).connect(wind).connect(master);
    // Flags: band-passed noise with a fast flutter.
    flagsG = ac.createGain(); flagsG.gain.value = 0.0;
    const fb = ac.createBiquadFilter(); fb.type = 'bandpass'; fb.frequency.value = 1800; fb.Q.value = 0.8;
    loop(white).connect(fb).connect(flagsG).connect(master);
    // Stream: white noise, band-passed, gain by distance to the nearest water.
    streamG = ac.createGain(); streamG.gain.value = 0;
    const sb = ac.createBiquadFilter(); sb.type = 'bandpass'; sb.frequency.value = 1200; sb.Q.value = 0.4;
    loop(white).connect(sb).connect(streamG).connect(master);
    // Chatter: voice-band noise with a syllable-rate tremolo, gain by the number of people nearby.
    chatterG = ac.createGain(); chatterG.gain.value = 0;
    const cb = ac.createBiquadFilter(); cb.type = 'bandpass'; cb.frequency.value = 700; cb.Q.value = 1.6;
    const trem = ac.createGain(); trem.gain.value = 0.5;
    const lfo = ac.createOscillator(); lfo.frequency.value = 4.7; const lfoG = ac.createGain(); lfoG.gain.value = 0.45;
    lfo.connect(lfoG).connect(trem.gain); lfo.start();
    loop(white).connect(cb).connect(trem).connect(chatterG).connect(master);
  };
  window.addEventListener('pointerdown', init, { once: false });
  window.addEventListener('keydown', init, { once: false });

  const bell = (panner: PannerNode, t0: number) => {
    if (!ac) return;
    // A small brass yak bell: three inharmonic partials with a quick decay.
    for (const [f, a, d] of [[1180, 0.25, 0.9], [2630, 0.12, 0.6], [3710, 0.06, 0.35]] as const) {
      const o = ac.createOscillator(); o.frequency.value = f * (0.97 + Math.random() * 0.06);
      const g = ac.createGain(); g.gain.setValueAtTime(a, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
      o.connect(g).connect(panner); o.start(t0); o.stop(t0 + d + 0.05);
    }
  };
  const horn = () => {
    if (!ac) return;
    // Dungchen: two low, slightly detuned saws, filtered, slow swell and fade.
    const t0 = ac.currentTime, g = ac.createGain(), lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 380;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.09, t0 + 1.8);
    g.gain.setValueAtTime(0.09, t0 + 5.5); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 8);
    for (const f of [57, 59.5]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(lp); o.start(t0); o.stop(t0 + 8.2); }
    lp.connect(g).connect(master);
  };

  const fwd = new THREE.Vector3(), upv = new THREE.Vector3();
  return {
    update(dt, cam, inp) {
      clock += dt;
      if (!ac) return;
      const L = ac.listener, p = cam.position;
      cam.getWorldDirection(fwd); upv.set(0, 1, 0).applyQuaternion(cam.quaternion);
      if (L.positionX) {
        L.positionX.value = p.x; L.positionY.value = p.y; L.positionZ.value = p.z;
        L.forwardX.value = fwd.x; L.forwardY.value = fwd.y; L.forwardZ.value = fwd.z;
        L.upX.value = upv.x; L.upY.value = upv.y; L.upZ.value = upv.z;
      }
      const tc = ac.currentTime;
      wind.gain.setTargetAtTime(0.25 + 0.15 * Math.sin(clock * 0.21) + 0.08 * Math.sin(clock * 0.73), tc, 0.5);
      flagsG.gain.setTargetAtTime(0.03 + 0.03 * Math.max(0, Math.sin(clock * 0.6)), tc, 0.3);
      streamG.gain.setTargetAtTime(Math.max(0, 0.28 * (1 - inp.streamDist / 40)), tc, 0.3);
      chatterG.gain.setTargetAtTime(Math.min(0.12, inp.peopleNear * 0.018), tc, 0.5);
      // One bell per yak, each on its own uneven stride.
      while (bells.length < inp.yaks.length) {
        const pn = ac.createPanner(); pn.panningModel = 'HRTF'; pn.distanceModel = 'inverse'; pn.refDistance = 4; pn.rolloffFactor = 1.2;
        pn.connect(master); bells.push({ panner: pn, next: clock + Math.random() });
      }
      inp.yaks.forEach((y, i) => {
        const b = bells[i];
        if (b.panner.positionX) { b.panner.positionX.value = y.x; b.panner.positionY.value = y.y + 1.2; b.panner.positionZ.value = y.z; }
        if (clock > b.next) { if (y.distanceTo(p) < 120) bell(b.panner, tc); b.next = clock + 0.7 + Math.random() * 0.5; }
      });
      if (clock > nextHorn) { horn(); nextHorn = clock + 70 + Math.random() * 80; }
    },
  };
}
