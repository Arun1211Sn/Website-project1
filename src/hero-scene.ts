import * as THREE from 'three';

export function initHeroScene(): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.getElementById('heroCanvas') as HTMLCanvasElement | null;
  if (!canvas) return;

  // WebGL availability check
  try {
    const testCtx = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!testCtx) return;
  } catch {
    return;
  }

  // ─── Renderer ────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  // ─── Scene & Camera ──────────────────────────────────────────────────────
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.set(0, 3, 9);
  camera.lookAt(0, 0, 0);

  // ─── Terrain ─────────────────────────────────────────────────────────────
  const terrainGeo = new THREE.PlaneGeometry(22, 14, 70, 70);
  terrainGeo.rotateX(-Math.PI / 2.5);

  const terrainMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying float vElevation;

      void main() {
        vec4 modelPos = modelMatrix * vec4(position, 1.0);

        float wave1 = sin(modelPos.x * 0.5 + uTime * 0.6) * 0.55;
        float wave2 = sin(modelPos.z * 0.4 + uTime * 0.5) * 0.45;
        float wave3 = sin((modelPos.x + modelPos.z) * 0.3 + uTime * 0.4) * 0.3;

        modelPos.y += wave1 + wave2 + wave3;
        vElevation = modelPos.y;

        gl_Position = projectionMatrix * viewMatrix * modelPos;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vElevation;

      void main() {
        // Map elevation to [0,1]
        float t = clamp((vElevation + 1.2) / 2.4, 0.0, 1.0);

        vec3 navyColor = vec3(0.04, 0.09, 0.16);   // #0a1628
        vec3 goldColor  = vec3(0.94, 0.71, 0.16);  // #f0b429

        vec3 color = mix(navyColor, goldColor, t * 0.55);
        float alpha = 0.55 + t * 0.2;

        gl_FragColor = vec4(color, alpha);
      }
    `,
    wireframe: true,
    transparent: true,
  });

  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.position.y = -1.5;
  scene.add(terrain);

  // ─── Particles ───────────────────────────────────────────────────────────
  const PARTICLE_COUNT = 500;
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const velocities = new Float32Array(PARTICLE_COUNT);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 24;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 12;
    velocities[i]        = 0.004 + Math.random() * 0.006;
  }

  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const particleMat = new THREE.PointsMaterial({
    size: 0.06,
    color: 0xf0b429,
    transparent: true,
    opacity: 0.65,
    sizeAttenuation: true,
  });

  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  // ─── Mouse parallax ──────────────────────────────────────────────────────
  const mouse = { x: 0, y: 0 };
  const hero = document.getElementById('home') ?? document.querySelector('.hero');

  function onMouseMove(e: MouseEvent): void {
    const bounds = (hero ?? document.body).getBoundingClientRect();
    mouse.x = ((e.clientX - bounds.left) / bounds.width  - 0.5) * 2;
    mouse.y = ((e.clientY - bounds.top)  / bounds.height - 0.5) * 2;
  }

  (hero ?? window).addEventListener('mousemove', onMouseMove as EventListener);

  // ─── Resize ──────────────────────────────────────────────────────────────
  function resize(): void {
    const heroEl = hero as HTMLElement | null;
    const w = heroEl?.clientWidth  ?? window.innerWidth;
    const h = heroEl?.clientHeight ?? window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  resize();
  window.addEventListener('resize', resize);

  // ─── Animation loop ──────────────────────────────────────────────────────
  let frameId = 0;
  const clock = new THREE.Clock();

  function animate(): void {
    frameId = requestAnimationFrame(animate);

    const elapsed = clock.getElapsedTime();
    terrainMat.uniforms['uTime'].value = elapsed;

    // Drift particles upward and wrap
    const pos = particleGeo.attributes['position'] as THREE.BufferAttribute;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pos.array[i * 3 + 1] += velocities[i];
      if (pos.array[i * 3 + 1] > 6) {
        pos.array[i * 3 + 1] = -6;
      }
    }
    pos.needsUpdate = true;

    // Smooth camera parallax
    camera.position.x += (mouse.x * 1.2 - camera.position.x) * 0.04;
    camera.position.y += (-mouse.y * 0.8 + 3 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }

  animate();

  // ─── Cleanup on page hide ────────────────────────────────────────────────
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(frameId);
    } else {
      clock.start();
      animate();
    }
  });
}
