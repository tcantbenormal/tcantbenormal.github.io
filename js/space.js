/**
 * Space scene: Blender-built satellite, Earth, stars, thruster plumes.
 * Lighting model = space: one hard sun, blue earthshine via environment, no ambient fill.
 * The `rig` object is the choreography contract; motion.js animates it with anime.js.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';

export const rig = {
  x: 2.0, y: 0.3, z: 0, rx: 0.35, ry: -1.75, rz: -0.85, scale: 0.92,
  wing: 0, thrust: 1, rcs: 0.25, beam: 0, earthY: 0, spin: 0,
};
/** Projected satellite position in CSS pixels, read by the HUD. */
export const screen = { x: 0, y: 0, r: 0 };

const SUN_DIR = new THREE.Vector3(-0.42, 0.42, 0.8).normalize();
const pointer = { x: 0, y: 0, sx: 0, sy: 0 };

export async function startSpace(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  const dpr = Math.min(devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020306);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 2000);
  camera.position.set(0, 0, 12);

  /* ---------------- lights: the sun and nothing else ---------------- */
  const sun = new THREE.DirectionalLight(0xfff3e6, 3.0);
  sun.position.copy(SUN_DIR).multiplyScalar(20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 45 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);

  /* ---------------- environment: black sky, lit Earth below, sun glow ---------------- */
  scene.environment = buildEnvironment(renderer);
  scene.environmentIntensity = 0.9;

  /* ---------------- stars ---------------- */
  scene.add(buildStars(4200));
  const glare = buildSunGlare();
  scene.add(glare);

  /* ---------------- Earth ---------------- */
  const earth = await buildEarth(renderer);
  scene.add(earth.group);

  /* ---------------- satellite ---------------- */
  const gltf = await new GLTFLoader().loadAsync('assets/models/satellite.glb');
  const sat = new THREE.Group();          // driven by rig
  const body = new THREE.Group();         // idle wobble
  sat.rotation.order = 'YXZ';
  sat.add(body); body.add(gltf.scene); scene.add(sat);

  const wings = [];
  const exhausts = [];
  let nozzleMat = null;
  gltf.scene.traverse(o => {
    if (o.isMesh) {
      o.castShadow = o.receiveShadow = true;
      const m = o.material;
      if (m.name === 'Nozzle') {
        nozzleMat = nozzleMat || m.clone();
        nozzleMat.emissive = new THREE.Color(1.0, 0.32, 0.06);
        o.material = nozzleMat;
      }
      if (m.name === 'Lens_Glass') { m.roughness = 0.03; m.envMapIntensity = 2.5; }
      if (m.name === 'Solar_Cells') { m.envMapIntensity = 1.4; }
    }
    if (o.name.startsWith('SAT_Wing_')) wings.push(o);
    if (o.name.startsWith('SAT_Exhaust_')) exhausts.push(o);
  });

  const plumes = exhausts.map(e => {
    const main = e.name.endsWith('Main');
    const r = e.userData.exit_radius || (main ? 0.2 : 0.055);
    const p = buildPlume(r, main);
    e.add(p.group);
    return { ...p, main };
  });
  const mainExhaust = exhausts.find(e => e.name.endsWith('Main'));
  const sparks = buildSparks(260);
  mainExhaust.add(sparks.points);
  const engineLight = new THREE.PointLight(0xff7a2e, 0, 2.5, 2);
  engineLight.position.set(0, 0, 0.35);
  mainExhaust.add(engineLight);

  const beam = buildBeam();
  beam.mesh.position.set(0, -1.1, -0.12);   // under the telescope (glTF space)
  gltf.scene.add(beam.mesh);

  /* ---------------- post ---------------- */
  // No MSAA on the target: multisampled half-float targets render black on some Intel/ANGLE drivers. SMAA handles edges.
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.42, 0.25, 1.05);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const smaa = new SMAAPass();
  composer.addPass(smaa);

  let narrow = false;
  const resize = () => {
    const w = innerWidth, h = innerHeight;
    narrow = w / h < 0.9;
    camera.aspect = w / h;
    camera.fov = narrow ? 44 : 32;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.resolution.set(w, h);
  };
  resize();
  addEventListener('resize', resize);
  addEventListener('pointermove', e => {
    pointer.x = e.clientX / innerWidth * 2 - 1;
    pointer.y = e.clientY / innerHeight * 2 - 1;
  }, { passive: true });

  /* ---------------- loop ---------------- */
  const timer = new THREE.Timer();
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  renderer.setAnimationLoop(() => {
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05);
    const t = timer.getElapsed();

    // Pointer parallax, smoothed so the whole scene floats.
    pointer.sx += (pointer.x - pointer.sx) * 0.04;
    pointer.sy += (pointer.y - pointer.sy) * 0.04;
    camera.position.x = pointer.sx * 0.45;
    camera.position.y = -pointer.sy * 0.3;
    camera.lookAt(0, 0, 0);

    // Satellite rig (+ responsive remap for portrait screens).
    let { x, y, z, scale } = rig;
    if (narrow) { x *= 0.12; y = y * 0.5 + 1.6; scale *= 0.62; }
    sat.position.set(x, y, z);
    sat.rotation.set(rig.rx, rig.ry + rig.spin, rig.rz);
    sat.scale.setScalar(scale);
    body.position.y = Math.sin(t * 0.6) * 0.06;
    body.rotation.z = Math.sin(t * 0.37) * 0.035;
    body.rotation.x = Math.cos(t * 0.29) * 0.03;
    wings.forEach(w => (w.rotation.x = rig.wing));

    // Thrusters.
    const flick = 0.85 + 0.15 * Math.sin(t * 61) * Math.sin(t * 23.7);
    plumes.forEach((p, i) => {
      const level = p.main ? rig.thrust : rig.rcs * (0.55 + 0.45 * Math.sin(t * 3.1 + i * 1.7));
      p.update(t, Math.max(level, 0), flick);
    });
    nozzleMat && (nozzleMat.emissiveIntensity = Math.min(rig.thrust, 2) * 1.6);
    engineLight.intensity = rig.thrust * 2.2 * flick;
    sparks.update(dt, rig.thrust);
    beam.update(t, rig.beam);

    // Earth.
    earth.group.position.y = -46 + rig.earthY;
    earth.update(t);
    glare.material.opacity = 0.9;

    // Shadow frustum follows the satellite.
    sun.target.position.copy(sat.position);
    sun.position.copy(sat.position).addScaledVector(SUN_DIR, 20);

    // HUD projection.
    sat.getWorldPosition(tmp);
    tmp2.copy(tmp).project(camera);
    screen.x = (tmp2.x + 1) / 2 * innerWidth;
    screen.y = (1 - tmp2.y) / 2 * innerHeight;
    tmp.addScaledVector(new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion), 1.6 * scale);
    tmp.project(camera);
    screen.r = Math.abs((tmp.x + 1) / 2 * innerWidth - screen.x);

    composer.render(dt);
  });

  document.documentElement.classList.add('space-ready');
}

/* =====================================================================
   Builders
   ===================================================================== */
function buildEnvironment(renderer) {
  const envScene = new THREE.Scene();
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { sunDir: { value: SUN_DIR } },
    vertexShader: /* glsl */`varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: /* glsl */`
      uniform vec3 sunDir; varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        float below = smoothstep(0.02, -0.5, d.y);
        vec3 col = vec3(0.045, 0.10, 0.22) * below;                       // sunlit ocean & cloud below
        col += vec3(0.22, 0.42, 0.85) * 0.35 * exp(-pow((d.y + 0.08) / 0.07, 2.));  // limb glow band
        float s = max(dot(d, sunDir), 0.);
        col += vec3(1.0, 0.95, 0.88) * (pow(s, 600.) * 7. + pow(s, 24.) * 0.12);
        gl_FragColor = vec4(col, 1.);
      }`,
  });
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 64, 32), mat));
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(envScene, 0.01);
  pmrem.dispose();
  return rt.texture;
}

function buildStars(n) {
  const pos = new Float32Array(n * 3), size = new Float32Array(n), tint = new Float32Array(n * 3);
  const v = new THREE.Vector3(), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    v.randomDirection().multiplyScalar(600);
    pos.set([v.x, v.y, v.z], i * 3);
    size[i] = Math.pow(Math.random(), 6) * 3.2 + 0.6;
    c.setHSL(0.55 + Math.random() * 0.12 - (Math.random() < 0.2 ? 0.5 : 0), 0.45, 0.85);
    tint.set([c.r, c.g, c.b], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('size', new THREE.BufferAttribute(size, 1));
  g.setAttribute('tint', new THREE.BufferAttribute(tint, 3));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 }, dpr: { value: Math.min(devicePixelRatio, 2) } },
    vertexShader: /* glsl */`
      attribute float size; attribute vec3 tint; uniform float dpr; varying vec3 vTint; varying float vSeed;
      void main(){ vTint = tint; vSeed = position.x * 0.13 + position.y * 0.07;
        gl_PointSize = size * dpr; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: /* glsl */`
      varying vec3 vTint; varying float vSeed;
      void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., d);
        gl_FragColor = vec4(vTint * a * 1.3, a); }`,
  });
  return new THREE.Points(g, m);
}

function buildSunGlare() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, 'rgba(255,250,240,1)');
  grd.addColorStop(0.08, 'rgba(255,236,210,0.85)');
  grd.addColorStop(0.3, 'rgba(255,190,140,0.12)');
  grd.addColorStop(1, 'rgba(255,160,120,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  s.position.copy(SUN_DIR).multiplyScalar(500);
  s.scale.setScalar(110);
  return s;
}

async function buildEarth(renderer) {
  const loader = new THREE.TextureLoader();
  const load = (f, srgb) => loader.loadAsync('assets/textures/' + f).then(t => {
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  });
  const [day, night, spec, clouds] = await Promise.all([
    load('earth_atmos_2048.jpg', true), load('earth_lights_2048.jpg', true),
    load('earth_specular_2048.jpg', false), load('earth_clouds_1024.jpg', false),
  ]);
  const R = 40;
  const group = new THREE.Group();
  group.position.set(0, -46, -22);
  group.rotation.set(-0.4, 0, 0.1);   // tilt so ~30°N faces the camera (Pakistan, via surface spin below)

  const surface = new THREE.Mesh(new THREE.SphereGeometry(R, 128, 96), new THREE.ShaderMaterial({
    uniforms: { day: { value: day }, night: { value: night }, spec: { value: spec }, sunDir: { value: SUN_DIR } },
    vertexShader: /* glsl */`
      varying vec2 vUv; varying vec3 vN; varying vec3 vW;
      void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform sampler2D day, night, spec; uniform vec3 sunDir; varying vec2 vUv; varying vec3 vN; varying vec3 vW;
      void main(){
        vec3 n = normalize(vN); vec3 V = normalize(cameraPosition - vW);
        float ndl = dot(n, sunDir);
        float lit = smoothstep(-0.12, 0.22, ndl);
        vec3 dayC = texture2D(day, vUv).rgb; dayC = mix(vec3(dot(dayC, vec3(.299,.587,.114))), dayC, 1.35) * (max(ndl, 0.) * 1.15 + 0.01);
        vec3 nightC = texture2D(night, vUv).rgb * vec3(1.0, 0.72, 0.42) * 1.6;
        vec3 H = normalize(sunDir + V);
        float sp = pow(max(dot(n, H), 0.), 80.) * texture2D(spec, vUv).r * 0.9;
        float fres = pow(1. - max(dot(n, V), 0.), 4.);
        vec3 col = mix(nightC, dayC, lit) + vec3(1., .93, .8) * sp * lit;
        col = mix(col, vec3(0.3, 0.55, 1.0) * (0.04 + lit * 0.5), fres * 0.22);
        gl_FragColor = vec4(col, 1.);
      }`,
  }));

  const cloudMesh = new THREE.Mesh(new THREE.SphereGeometry(R * 1.006, 128, 96), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { map: { value: clouds }, sunDir: { value: SUN_DIR } },
    vertexShader: /* glsl */`varying vec2 vUv; varying vec3 vN; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: /* glsl */`
      uniform sampler2D map; uniform vec3 sunDir; varying vec2 vUv; varying vec3 vN;
      void main(){ float c = texture2D(map, vUv).r; float ndl = dot(normalize(vN), sunDir);
        float lit = smoothstep(-0.1, 0.3, ndl);
        gl_FragColor = vec4(vec3(1.) * (max(ndl,0.) * 0.95 + 0.02), c * (0.08 + 0.5 * lit)); }`,
  }));

  const atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.018, 128, 96), new THREE.ShaderMaterial({
    side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { sunDir: { value: SUN_DIR } },
    vertexShader: /* glsl */`varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform vec3 sunDir; varying vec3 vN; varying vec3 vW;
      void main(){ vec3 V = normalize(cameraPosition - vW); vec3 n = normalize(vN);
        float rim = pow(clamp(1.0 + dot(n, V), 0., 1.), 9.);
        float lit = 0.15 + smoothstep(-0.35, 0.45, dot(-n, sunDir) * -1.);
        vec3 col = mix(vec3(0.2, 0.45, 1.0), vec3(0.5, 0.78, 1.0), rim) * rim * lit * 1.6;
        gl_FragColor = vec4(col, rim); }`,
  }));

  group.add(surface, cloudMesh, atmo);
  return {
    group,
    update(t) { surface.rotation.y = 3.49 + t * 0.003; cloudMesh.rotation.y = 3.49 + t * 0.0045; },
  };
}

const NOISE = /* glsl */`
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }`;

/** Exhaust plume: additive layered cones along local +Z (glTF exhaust direction). */
function buildPlume(exitR, main) {
  const group = new THREE.Group();
  const layers = [];
  const mk = (rNear, rFar, len, hot, mid, cool, power, diamonds) => {
    const g = new THREE.CylinderGeometry(rFar, rNear, len, 40, 32, true);
    g.translate(0, len / 2, 0); g.rotateX(Math.PI / 2);
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { time: { value: 0 }, level: { value: 1 }, hot: { value: hot }, mid: { value: mid }, cool: { value: cool }, power: { value: power }, diamonds: { value: diamonds } },
      vertexShader: /* glsl */`varying vec2 vUv; varying vec3 vNV; varying vec3 vPV;
        void main(){ vUv = uv; vNV = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.); vPV = mv.xyz; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: NOISE + /* glsl */`
        uniform float time, level, power, diamonds; uniform vec3 hot, mid, cool; varying vec2 vUv; varying vec3 vNV; varying vec3 vPV;
        void main(){
          float t = vUv.y;
          float facing = abs(dot(normalize(vNV), normalize(-vPV)));
          float body = pow(facing, power);
          float fall = pow(1. - t, 1.7) * smoothstep(0., 0.04, t);
          float n = noise(vec2(vUv.x * 9., t * 7. - time * 16.)) * 0.6 + noise(vec2(vUv.x * 23., t * 19. - time * 31.)) * 0.4;
          float shock = 1. + diamonds * 0.55 * pow(0.5 + 0.5 * sin(t * 46. - time * 4.), 6.) * (1. - t);
          vec3 col = mix(hot, mid, smoothstep(0., 0.28, t)); col = mix(col, cool, smoothstep(0.28, 1., t));
          float a = body * fall * (0.55 + 0.45 * n) * shock * level;
          gl_FragColor = vec4(col * a, a);
        }`,
    });
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 10;
    group.add(mesh); layers.push({ mesh, m, len });
  };
  const C = (r, g, b, k) => new THREE.Vector3(r * k, g * k, b * k);
  if (main) {
    mk(exitR * 0.55, exitR * 1.1, exitR * 15, C(1, .97, .92, 10), C(1, .62, .3, 5), C(1, .3, .1, 1.6), 2.6, 1.0);   // core + shock diamonds
    mk(exitR * 0.95, exitR * 5.0, exitR * 24, C(1, .7, .4, 2.4), C(1, .38, .12, 1.3), C(.8, .18, .1, .3), 1.4, 0.0); // vacuum-expanded outer plume
  } else {
    mk(exitR * 0.6, exitR * 2.2, exitR * 9, C(.85, .95, 1, 4), C(.55, .75, 1, 1.6), C(.3, .5, 1, .3), 2.0, 0.0);
  }
  return {
    group,
    update(time, level, flick) {
      group.visible = level > 0.01;
      group.scale.set(1, 1, 0.35 + level * 0.65 * flick + (main ? level * 0.15 : 0));
      layers.forEach(l => { l.m.uniforms.time.value = time; l.m.uniforms.level.value = Math.min(level, 1.6) * flick; });
    },
  };
}

/** Hot particles streaming out of the main engine. */
function buildSparks(n) {
  const pos = new Float32Array(n * 3), life = new Float32Array(n), vel = new Float32Array(n * 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('life', new THREE.BufferAttribute(life, 1));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { dpr: { value: Math.min(devicePixelRatio, 2) } },
    vertexShader: /* glsl */`attribute float life; uniform float dpr; varying float vL;
      void main(){ vL = life; vec4 mv = modelViewMatrix * vec4(position,1.); gl_PointSize = (2.5 + 5. * life) * dpr * (6. / -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */`varying float vL;
      void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., d) * vL;
        vec3 c = mix(vec3(1., .25, .06), vec3(1., .85, .6), vL) * 3.; gl_FragColor = vec4(c * a, a); }`,
  });
  const points = new THREE.Points(g, m); points.frustumCulled = false;
  const spawn = i => {
    const a = Math.random() * Math.PI * 2, s = Math.random() * 0.12;
    pos.set([Math.cos(a) * s * 0.6, Math.sin(a) * s * 0.6, 0.05], i * 3);
    vel.set([Math.cos(a) * s * 3, Math.sin(a) * s * 3, 3 + Math.random() * 4], i * 3);
    life[i] = 0.6 + Math.random() * 0.4;
  };
  for (let i = 0; i < n; i++) { spawn(i); life[i] = Math.random(); }
  return {
    points,
    update(dt, thrust) {
      points.visible = thrust > 0.05;
      for (let i = 0; i < n; i++) {
        life[i] -= dt * (1.3 + Math.random() * 0.4);
        if (life[i] <= 0) { thrust > 0.05 ? spawn(i) : (life[i] = 0); continue; }
        pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt * (0.5 + thrust * 0.5);
      }
      g.attributes.position.needsUpdate = true; g.attributes.life.needsUpdate = true;
    },
  };
}

/** Nadir scan beam from the telescope down to Earth. */
function buildBeam() {
  const len = 14;
  const g = new THREE.CylinderGeometry(0.2, 2.6, len, 48, 1, true);
  g.translate(0, -len / 2, 0);
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { time: { value: 0 }, level: { value: 0 } },
    vertexShader: /* glsl */`varying vec2 vUv; varying vec3 vNV; varying vec3 vPV; void main(){ vUv = uv; vNV = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.); vPV = mv.xyz; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */`uniform float time, level; varying vec2 vUv; varying vec3 vNV; varying vec3 vPV;
      void main(){ float t = 1. - vUv.y; float facing = abs(dot(normalize(vNV), normalize(-vPV)));
        float edge = pow(1. - facing, 2.) * 0.8 + 0.12;
        float scan = smoothstep(0.96, 1., fract(t * 6. - time * 0.8)) * 1.6;
        float a = (edge + scan) * pow(1. - t, 0.6) * level * 0.5;
        vec3 c = vec3(0.15, 0.95, 0.85) * 1.6; gl_FragColor = vec4(c * a, a); }`,
  });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false;
  return { mesh, update(t, level) { mesh.visible = level > 0.01; m.uniforms.time.value = t; m.uniforms.level.value = level; } };
}
