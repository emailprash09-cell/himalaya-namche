// M2.5 post chain: scene pass with normals, ground-truth ambient occlusion (GTAO, half resolution; the WebGPU
// stack's equivalent of N8AO), gentle bloom, AgX tone mapping on output. Works on both backends.
import * as THREE from 'three/webgpu';
import { mrt, normalView, output, pass, vec4 } from 'three/tsl';
import { ao } from 'three/addons/tsl/display/GTAONode.js';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';

export interface Post { render(): void; setCamera(c: THREE.Camera): void }

export function buildPost(renderer: THREE.WebGPURenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, enabled = true): Post {
  if (!enabled) return { render: () => renderer.render(scene, camera), setCamera: () => undefined };
  const post = new THREE.RenderPipeline(renderer);
  const scenePass = pass(scene, camera);
  scenePass.setMRT(mrt({ output, normal: normalView }));
  const col = scenePass.getTextureNode('output');
  const aoPass = ao(scenePass.getTextureNode('depth'), scenePass.getTextureNode('normal'), camera);
  aoPass.resolutionScale = 0.5;
  aoPass.distanceExponent.value = 1;
  aoPass.radius.value = 0.6;
  aoPass.scale.value = 1.0;
  aoPass.thickness.value = 1.5;
  const lit = vec4(col.rgb.mul(aoPass.getTextureNode().r), col.a);
  const glow = bloom(lit, 0.18, 0.35, 0.92);
  post.outputNode = lit.add(glow);
  return { render: () => post.render(), setCamera: () => undefined };
}
