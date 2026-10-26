import * as THREE from 'three';
import { renderEye, type EyeMode, type EyeStyle } from './eye3d';
const q = new URLSearchParams(location.search), sec = JSON.parse(decodeURIComponent(q.get('s') ?? '{}'));
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping;
document.body.append(r.domElement);
renderEye(r, sec, (q.get('m') ?? 'piy') as EyeMode, (q.get('v') ?? 'rangli') as EyeStyle, 1400, 860, 1); (window as any).__done = true;
