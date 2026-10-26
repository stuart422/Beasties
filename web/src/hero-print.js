import * as THREE from 'three';

// The hero photograph as a real print in space: one textured plane on a white mount,
// with a soft plum-tinted shadow and a faint sheen. It tilts a few degrees toward the
// pointer and leans back as the hero scrolls away. Nothing else lives in the scene.
// The scene is laid out in CSS pixels, so at rest the print sits exactly where the
// <img> fallback sits and the swap is invisible.

const FOV = 30;
const MAX_TILT = THREE.MathUtils.degToRad(4);
const plane = new THREE.PlaneGeometry(1, 1);

export function webglAvailable() {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

export class HeroPrint {
  constructor({ canvas, frame, img, onReady, onLost }) {
    this.canvas = canvas;
    this.frame = frame;
    this.img = img;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); onLost?.(); });

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 1, 10000);
    this.print = new THREE.Group();
    this.scene.add(this.print);

    this.shadowTex = makeShadowTexture();
    this.sheenTex = makeSheenTexture();
    this.shadow = mesh(new THREE.MeshBasicMaterial({ map: this.shadowTex, color: '#2E1440', transparent: true, depthWrite: false }));
    this.mount = mesh(new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true }));
    this.photo = mesh(new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true }));
    this.sheen = mesh(new THREE.MeshBasicMaterial({ map: this.sheenTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.print.add(this.shadow, this.mount, this.photo, this.sheen);

    // live values (damped toward targets)
    this.tilt = new THREE.Vector2();
    this.tiltGoal = new THREE.Vector2();
    this.scroll = 0; // 0 at rest, 1 when the hero has scrolled away
    this.intro = 0; // 0 hidden, 1 settled (tweened from outside)
    this.dirty = true;

    new THREE.TextureLoader().load(img.currentSrc || img.src, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
      this.photo.material.map = tex;
      this.photo.material.needsUpdate = true;
      this.tex = tex;
      this.layout();
      onReady?.();
    });

    this.resizeObserver = new ResizeObserver(() => this.layout());
    this.resizeObserver.observe(canvas);
  }

  layout() {
    const c = this.canvas.getBoundingClientRect();
    const f = this.frame.getBoundingClientRect();
    if (!c.width || !f.width) return;
    this.renderer.setSize(c.width, c.height, false);
    this.camera.aspect = c.width / c.height;
    this.camera.position.set(0, 0, c.height / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
    this.camera.updateProjectionMatrix();

    // print centre relative to the canvas centre, in CSS pixels (y up)
    this.home = new THREE.Vector3(
      f.left + f.width / 2 - (c.left + c.width / 2),
      -(f.top + f.height / 2 - (c.top + c.height / 2)),
      0,
    );
    const pad = parseFloat(getComputedStyle(this.frame).paddingLeft) || 0;
    this.mount.scale.set(f.width, f.height, 1);
    this.photo.scale.set(f.width - pad * 2, f.height - pad * 2, 1);
    this.photo.position.z = 0.5;
    this.shadow.scale.set(f.width * 1.16, f.height * 1.22, 1);
    this.shadow.position.set(0, -f.height * 0.06, -2);
    this.sheen.scale.set(f.width - pad * 2, f.height - pad * 2, 1);
    this.sheen.position.z = 1;
    this.dirty = true;
  }

  setPointer(nx, ny) {
    this.tiltGoal.set(nx * MAX_TILT, ny * MAX_TILT * 0.75);
  }

  tick(dt) {
    if (!this.home || !this.tex) return;
    const k = 1 - Math.exp(-dt * 5);
    const before = this.tilt.clone();
    this.tilt.lerp(this.tiltGoal, k);
    if (before.distanceToSquared(this.tilt) > 1e-10) this.dirty = true;
    if (!this.dirty) return;
    this.dirty = this.tilt.distanceToSquared(this.tiltGoal) > 1e-8;

    const e = 1 - this.intro; // opening: the print settles back into the page
    const s = this.scroll;
    this.print.position.copy(this.home);
    this.print.position.y += -40 * e + 30 * s;
    this.print.position.z = -160 * e - 140 * s;
    this.print.rotation.set(
      -this.tilt.y + THREE.MathUtils.degToRad(9 * e + 9 * s),
      this.tilt.x + THREE.MathUtils.degToRad(-6 * e),
      THREE.MathUtils.degToRad(-1.2 * e),
    );
    const o = Math.min(1, this.intro * 1.4);
    this.mount.material.opacity = o;
    this.photo.material.opacity = o;
    this.shadow.material.opacity = 0.55 * o * (1 - s * 0.4);
    // the sheen drifts opposite the tilt, like light catching the paper
    this.sheen.material.opacity = 0.05 + Math.abs(this.tilt.x) * 1.2;
    this.sheen.position.x = -this.tilt.x * 900;
    this.sheen.position.y = this.tilt.y * 700;
    this.renderer.render(this.scene, this.camera);
  }

  markDirty() {
    this.dirty = true;
  }

  dispose() {
    this.resizeObserver.disconnect();
    [this.shadow, this.mount, this.photo, this.sheen].forEach((m) => m.material.dispose());
    [this.shadowTex, this.sheenTex, this.tex].forEach((t) => t?.dispose());
    this.renderer.dispose();
  }
}

function mesh(material) {
  return new THREE.Mesh(plane, material);
}

function makeShadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.filter = 'blur(12px)';
  g.fillStyle = '#fff';
  g.fillRect(26, 26, 76, 76);
  return new THREE.CanvasTexture(c);
}

function makeSheenTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}
