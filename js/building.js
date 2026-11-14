/*
 * Ápice Soluções — modelo 3D paramétrico de edificação (Three.js)
 * Linha do tempo "planta → modelo 3D": planta baixa em linhas técnicas,
 * cotas, estrutura em arame, extrusão pavimento a pavimento e transição
 * para o modelo realista (materiais, iluminação, sombras e reflexos).
 * Depende de window.THREE (vendor/three.bundle.min.js).
 */
(function () {
  'use strict';
  const T = window.THREE;
  if (!T) throw new Error('Three.js não carregou (vendor/three.bundle.min.js).');

  const clamp01 = v => Math.min(1, Math.max(0, v));
  const seg = (p, a, b) => clamp01((p - a) / (b - a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const Ease = {
    inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outCubic: t => 1 - Math.pow(1 - t, 3),
    inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
    outBack: t => { if (t <= 0) return 0; if (t >= 1) return 1; const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
  };
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fmtM = v => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m';
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  /* ---------------- Texturas procedurais (sem arquivos externos) ---------------- */
  const SURFACE = {
    acm:         { meters: 3.0, roughness: 0.30, metalness: 0.55, env: 1.0, bump: 0.6 },
    vidro:       { meters: 3.0, roughness: 0.06, metalness: 0.90, env: 1.5, bump: 0.3 },
    porcelanato: { meters: 2.4, roughness: 0.40, metalness: 0.00, env: 0.6, bump: 0.8 },
    pastilha:    { meters: 0.8, roughness: 0.35, metalness: 0.00, env: 0.7, bump: 1.0 },
    textura:     { meters: 2.0, roughness: 0.95, metalness: 0.00, env: 0.3, bump: 1.2 },
    concreto:    { meters: 2.4, roughness: 0.85, metalness: 0.00, env: 0.3, bump: 1.0 },
    tijolo:      { meters: 1.2, roughness: 0.90, metalness: 0.00, env: 0.25, bump: 1.4 }
  };
  const textureCache = new Map();
  function paintSurface(tipo) {
    const N = 1024, c = document.createElement('canvas'); c.width = c.height = N;
    const g = c.getContext('2d'), r = mulberry32(tipo.length * 977 + 13);
    const speckle = (count, alpha, min, max, lo = 0, hi = 255) => {
      for (let i = 0; i < count; i++) { const v = Math.floor(lo + r() * (hi - lo)); g.fillStyle = `rgba(${v},${v},${v},${alpha})`; const s = min + r() * (max - min); g.fillRect(r() * N, r() * N, s, s); }
    };
    const grid = (cols, rows, joint, color, offsetRows = false) => {
      g.fillStyle = color; const cw = N / cols, rh = N / rows;
      for (let j = 0; j <= rows; j++) g.fillRect(0, j * rh - joint / 2, N, joint);
      for (let j = 0; j < rows; j++) { const off = offsetRows && j % 2 ? cw / 2 : 0; for (let i = 0; i <= cols; i++) g.fillRect(i * cw + off - joint / 2, j * rh, joint, rh); }
    };
    switch (tipo) {
      case 'acm': {
        const n = 2, s = N / n;
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const gr = g.createLinearGradient(i * s, j * s, i * s + s, j * s + s); const b = 238 + r() * 12; gr.addColorStop(0, `rgb(${b},${b},${b})`); gr.addColorStop(1, `rgb(${b - 22},${b - 22},${b - 20})`); g.fillStyle = gr; g.fillRect(i * s, j * s, s, s); }
        grid(n, n, 12, '#3a3f44'); break;
      }
      case 'vidro': {
        const gr = g.createLinearGradient(0, 0, 0, N); gr.addColorStop(0, '#f6f9fb'); gr.addColorStop(0.5, '#d4dde3'); gr.addColorStop(1, '#eef3f6'); g.fillStyle = gr; g.fillRect(0, 0, N, N);
        g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.moveTo(N * 0.1, 0); g.lineTo(N * 0.35, 0); g.lineTo(N * 0.05, N); g.lineTo(-N * 0.2, N); g.fill();
        grid(2, 2, 14, '#2a2f34'); break;
      }
      case 'porcelanato': {
        const cols = 2, rows = 4, cw = N / cols, rh = N / rows;
        for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) { const b = 228 + r() * 20; g.fillStyle = `rgb(${b},${b - 2},${b - 5})`; g.fillRect(i * cw, j * rh, cw, rh); }
        speckle(9000, 0.08, 1, 3, 120, 255); grid(cols, rows, 4, '#8f8d88'); break;
      }
      case 'pastilha': {
        const n = 16, s = N / n;
        g.fillStyle = '#dcdcd6'; g.fillRect(0, 0, N, N);
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const b = 190 + r() * 60; g.fillStyle = `rgb(${b},${b},${b})`; g.fillRect(i * s + 4, j * s + 4, s - 8, s - 8); }
        break;
      }
      case 'concreto': {
        g.fillStyle = '#dedcd8'; g.fillRect(0, 0, N, N);
        for (let i = 0; i < 260; i++) { const v = 190 + r() * 60; g.fillStyle = `rgba(${v},${v},${v},0.06)`; g.beginPath(); g.arc(r() * N, r() * N, 10 + r() * 60, 0, Math.PI * 2); g.fill(); }
        speckle(14000, 0.10, 1, 3, 90, 200); grid(2, 1, 4, '#a9a6a0');
        g.fillStyle = '#7f7c77'; for (const x of [0.25, 0.75]) for (const y of [0.2, 0.5, 0.8]) { g.beginPath(); g.arc(x * N, y * N, 7, 0, Math.PI * 2); g.fill(); }
        break;
      }
      case 'tijolo': {
        g.fillStyle = '#d8d1c6'; g.fillRect(0, 0, N, N);
        const cols = 6, rows = 16, cw = N / cols, rh = N / rows;
        for (let j = 0; j < rows; j++) { const off = j % 2 ? cw / 2 : 0; for (let i = -1; i <= cols; i++) { const b = 195 + r() * 60; g.fillStyle = `rgb(${b},${b},${b})`; g.fillRect(i * cw + off + 4, j * rh + 4, cw - 8, rh - 8); } }
        speckle(6000, 0.08, 1, 3, 60, 160); break;
      }
      default: { // textura acrílica
        g.fillStyle = '#f2f2f0'; g.fillRect(0, 0, N, N); speckle(60000, 0.07, 1, 3, 150, 255); speckle(9000, 0.06, 2, 4, 80, 160);
      }
    }
    return c;
  }
  function getSurfaceTexture(tipo) {
    if (!textureCache.has(tipo)) {
      const canvas = paintSurface(tipo), meters = SURFACE[tipo].meters;
      const map = new T.CanvasTexture(canvas);
      map.colorSpace = T.SRGBColorSpace; map.wrapS = map.wrapT = T.RepeatWrapping; map.repeat.set(1 / meters, 1 / meters); map.anisotropy = 8;
      const bump = new T.CanvasTexture(canvas); // luminância como relevo
      bump.wrapS = bump.wrapT = T.RepeatWrapping; bump.repeat.set(1 / meters, 1 / meters); bump.anisotropy = 8;
      textureCache.set(tipo, { map, bump });
    }
    return textureCache.get(tipo);
  }
  function radialAlphaTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    const gr = g.createRadialGradient(128, 128, 20, 128, 128, 128); gr.addColorStop(0, '#fff'); gr.addColorStop(0.55, '#bbb'); gr.addColorStop(1, '#000');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256); return new T.CanvasTexture(c);
  }

  /* Céu externo (equiretangular) usado como mapa de ambiente: o vidro reflete céu, horizonte e chão */
  function skyEquirect() {
    const w = 1024, h = 512, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#3f78b8'); gr.addColorStop(0.32, '#8db8de'); gr.addColorStop(0.47, '#dbe8f0'); gr.addColorStop(0.5, '#f4f4ef');
    gr.addColorStop(0.53, '#b9b4a8'); gr.addColorStop(0.75, '#8d8778'); gr.addColorStop(1, '#5d594f');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const r = mulberry32(42);
    for (let i = 0; i < 40; i++) { const x = r() * w, y = 60 + r() * 150, rx = 30 + r() * 90, ry = 6 + r() * 14; const cg = g.createRadialGradient(x, y, 1, x, y, rx); cg.addColorStop(0, 'rgba(255,255,255,0.55)'); cg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = cg; g.save(); g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y); g.beginPath(); g.arc(x, y, rx, 0, Math.PI * 2); g.fill(); g.restore(); }
    // silhueta urbana discreta no horizonte
    g.fillStyle = 'rgba(120,130,140,0.35)'; for (let x = 0; x < w; x += 6 + r() * 14) { const bh = 4 + r() * 22; g.fillRect(x, h * 0.5 - bh, 5 + r() * 12, bh); }
    const sx = w * 0.62, sy = h * 0.22, sg = g.createRadialGradient(sx, sy, 2, sx, sy, 70); sg.addColorStop(0, 'rgba(255,255,250,1)'); sg.addColorStop(0.15, 'rgba(255,250,235,0.9)'); sg.addColorStop(1, 'rgba(255,245,220,0)');
    g.fillStyle = sg; g.fillRect(sx - 80, sy - 80, 160, 160);
    const t = new T.CanvasTexture(c); t.mapping = T.EquirectangularReflectionMapping; t.colorSpace = T.SRGBColorSpace; return t;
  }
  function paintSite(kind) {
    const N = 512, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), r = mulberry32(kind.length * 31 + 7);
    const speck = (n, a, lo, hi, s0, s1) => { for (let i = 0; i < n; i++) { const v = Math.floor(lo + r() * (hi - lo)); g.fillStyle = `rgba(${v},${v},${v},${a})`; const sz = s0 + r() * (s1 - s0); g.fillRect(r() * N, r() * N, sz, sz); } };
    if (kind === 'calcada') { g.fillStyle = '#e4e2dc'; g.fillRect(0, 0, N, N); speck(5000, 0.08, 100, 240, 1, 3); g.fillStyle = '#b9b6ae'; for (let i = 0; i <= 4; i++) { g.fillRect(i * N / 4 - 2, 0, 4, N); g.fillRect(0, i * N / 4 - 2, N, 4); } }
    else if (kind === 'grama') { g.fillStyle = '#6f8f4e'; g.fillRect(0, 0, N, N); for (let i = 0; i < 16000; i++) { const gg = 100 + r() * 90; g.fillStyle = `rgba(${gg * 0.6 | 0},${gg | 0},${gg * 0.45 | 0},0.35)`; g.fillRect(r() * N, r() * N, 1.5, 3 + r() * 4); } }
    else { g.fillStyle = '#4a4d50'; g.fillRect(0, 0, N, N); speck(20000, 0.18, 30, 140, 1, 2.5); }
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; const m = kind === 'calcada' ? 2.4 : kind === 'grama' ? 3 : 4; t.repeat.set(1 / m, 1 / m); t.anisotropy = 8; return t;
  }
  function contactShadowTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    g.filter = 'blur(18px)'; g.fillStyle = 'rgba(0,0,0,1)'; g.fillRect(48, 48, 160, 160);
    return new T.CanvasTexture(c);
  }

  /* UVs em metros (coordenadas do mundo) para a textura continuar entre pavimentos */
  function worldUV(geo, yOffset) {
    const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i) + yOffset, z = pos.getZ(i), nx = Math.abs(nor.getX(i)), nz = Math.abs(nor.getZ(i));
      if (nx > 0.5) uv.setXY(i, z * Math.sign(nor.getX(i)) * -1, y);
      else if (nz > 0.5) uv.setXY(i, x * Math.sign(nor.getZ(i)), y);
      else uv.setXY(i, x, z);
    }
    uv.needsUpdate = true; return geo;
  }

  // Ordem dos materiais do BoxGeometry: +x, -x, +y, -y, +z, -z
  const FACE_INDEX = { direita: 0, esquerda: 1, frente: 4, fundos: 5 };
  const FACES = ['frente', 'direita', 'fundos', 'esquerda'];

  function makeLabel(text, worldHeight) {
    const font = '600 64px "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
    const probe = document.createElement('canvas').getContext('2d'); probe.font = font;
    const w = Math.ceil(probe.measureText(text).width) + 56, h = 104;
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    g.fillStyle = 'rgba(8,42,84,0.82)'; g.strokeStyle = 'rgba(160,232,255,0.9)'; g.lineWidth = 3;
    g.beginPath(); g.roundRect(3, 3, w - 6, h - 6, 18); g.fill(); g.stroke();
    g.font = font; g.fillStyle = '#e8fbff'; g.textBaseline = 'middle'; g.fillText(text, 28, h / 2 + 2);
    const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4;
    const mat = new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
    const sprite = new T.Sprite(mat); sprite.scale.set(worldHeight * (w / h), worldHeight, 1); sprite.renderOrder = 10;
    return sprite;
  }

  class FacadeBuilding {
    constructor(container, options = {}) {
      this.container = container;
      this.opts = Object.assign({ zoom: true, rotate: true, autoRotate: true, label: 'Modelo 3D da edificação' }, options);
      this.blueprintLayer = container.querySelector('.bp-bg');
      this.listeners = {};

      const renderer = this.renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = T.PCFSoftShadowMap;
      renderer.setClearColor(0x000000, 0);
      const canvas = renderer.domElement;
      canvas.className = 'viewer-canvas';
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', this.opts.label);
      canvas.tabIndex = 0;
      container.appendChild(canvas);

      const scene = this.scene = new T.Scene();
      const pmrem = new T.PMREMGenerator(renderer);
      const sky = skyEquirect();
      scene.environment = pmrem.fromEquirectangular(sky).texture;
      sky.dispose(); pmrem.dispose();
      renderer.toneMappingExposure = 1.05;

      // lente mais longa = perspectiva arquitetônica, com menos distorção
      this.camera = new T.PerspectiveCamera(28, 1, 0.1, 3000);
      const controls = this.controls = new T.OrbitControls(this.camera, canvas);
      controls.enableDamping = true; controls.dampingFactor = 0.07;
      controls.enableZoom = this.opts.zoom; controls.enableRotate = this.opts.rotate; controls.enablePan = false;
      controls.maxPolarAngle = Math.PI * 0.49; controls.minPolarAngle = 0.15;
      controls.rotateSpeed = 0.7; controls.autoRotateSpeed = 0.55;

      this.hemi = new T.HemisphereLight(0xd6e8ff, 0x8a7d68, 1.0); scene.add(this.hemi);
      const sun = this.sun = new T.DirectionalLight(0xfff0d6, 3.6);
      sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.04; sun.shadow.radius = 3;
      scene.add(sun, sun.target);
      this.fill = new T.DirectionalLight(0xcfe3ff, 0.6); scene.add(this.fill);

      // Materiais
      const M = (o) => new T.MeshStandardMaterial(o);
      this.mat = {
        finish: M({ color: 0xffffff }),
        existing: M({ color: 0xd6d0c4, roughness: 0.95 }),
        trim: M({ color: 0xeeebe4, roughness: 0.7 }),
        roof: M({ color: 0x6e7478, roughness: 0.92 }),
        frame: M({ color: 0x2a2f34, roughness: 0.4, metalness: 0.6 }),
        glass: new T.MeshPhysicalMaterial({ color: 0x23394a, roughness: 0.04, metalness: 0.15, envMapIntensity: 2.4, clearcoat: 1, clearcoatRoughness: 0.04, ior: 1.52, specularIntensity: 1 }),
        railing: M({ color: 0xa8c8d8, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.35 }),
        plaza: M({ color: 0xc9ccc8, roughness: 0.95 })
      };
      const ex = getSurfaceTexture('textura'); this.mat.existing.map = ex.map; this.mat.existing.bumpMap = ex.bump; this.mat.existing.bumpScale = 0.8;
      this.mat.railing.userData.baseOpacity = 0.35;
      this.solidMaterials = Object.values(this.mat);
      // entorno: calçada, grama, rua, árvores (aparecem com a luz)
      const st = k => paintSite(k);
      this.site = {
        calcada: M({ map: st('calcada'), roughness: 0.92 }),
        grama: M({ map: st('grama'), roughness: 1 }),
        asfalto: M({ map: st('asfalto'), roughness: 0.95 }),
        faixa: M({ color: 0xf1f0ea, roughness: 0.8 }),
        tronco: M({ color: 0x6b513b, roughness: 0.95 }),
        copa: M({ color: 0x4f7a3a, roughness: 0.9, flatShading: true }),
        arbusto: M({ color: 0x5f8a45, roughness: 0.9, flatShading: true })
      };
      this.site.calcada.map.userData = {};
      this.siteMaterials = Object.values(this.site);
      this.contactMat = new T.MeshBasicMaterial({ color: 0x000000, alphaMap: contactShadowTexture(), transparent: true, opacity: 0.5, depthWrite: false });
      this.edgeMat = new T.LineBasicMaterial({ color: 0xc4f1ff, transparent: true, opacity: 0.95 });
      this.planMat = new T.LineBasicMaterial({ color: 0x9fe6ff, transparent: true, opacity: 0.9 });
      this.dimMat = new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthTest: false });

      this.groundMat = new T.MeshStandardMaterial({ color: 0xcfd1cc, roughness: 1, transparent: true, alphaMap: radialAlphaTexture(), depthWrite: false });
      this.ground = new T.Mesh(new T.CircleGeometry(1, 96), this.groundMat);
      this.ground.rotation.x = -Math.PI / 2; this.ground.receiveShadow = true; scene.add(this.ground);
      this.grid = null;

      this.cyan = new T.Color(0x3fc8ff); this.amber = new T.Color(0xffa43a);
      this.params = null; this.root = null; this.fitR = 60; this.dims = { W: 1, D: 1, H: 1 };
      this.tl = { p: 1, mode: 'full', playing: false, start: 0, dur: 7000 };
      this.camFrom = null; this.camTo = null;
      this.colorTween = null; this.pulseStart = -1e9; this.visible = true;
      this.lastReveal = -1;

      this._tick = this._tick.bind(this);
      this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(container);
      this.io = new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; renderer.setAnimationLoop(this.visible ? this._tick : null); }, { threshold: 0.01 });
      this.io.observe(container);
      canvas.addEventListener('pointerdown', () => { if (this.tl.playing && this.tl.mode === 'full') this.finish(); });
      this.resize();
    }

    on(evt, fn) { (this.listeners[evt] ||= []).push(fn); }
    emit(evt, data) { (this.listeners[evt] || []).forEach(fn => fn(data)); }

    resize() {
      const w = Math.max(1, this.container.clientWidth), h = Math.max(1, this.container.clientHeight);
      this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
      this._computeFit();
      if (!this.tl.playing) this.render();
    }

    _computeFit() {
      const { W, D, H } = this.dims;
      const rS = 0.5 * Math.sqrt(W * W + H * H + D * D);
      const vfov = T.MathUtils.degToRad(this.camera.fov);
      const hfov = 2 * Math.atan(Math.tan(vfov / 2) * this.camera.aspect);
      this.boundR = rS;
      this.fitR = (rS / Math.sin(Math.min(vfov, hfov) / 2)) * 1.12; // margem para a perspectiva
      this.controls.minDistance = rS * 1.15; this.controls.maxDistance = this.fitR * 2.6;
    }

    /* ---------- Construção da geometria ---------- */
    _disposeRoot() {
      if (!this.root) return;
      this.root.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.isSprite) { o.material.map.dispose(); o.material.dispose(); } });
      this.scene.remove(this.root); this.root = null;
    }

    _faceMaterials() {
      const arr = [this.mat.existing, this.mat.existing, this.mat.roof, this.mat.trim, this.mat.existing, this.mat.existing];
      for (const f of FACES) if (this.params.faces[f]) arr[FACE_INDEX[f]] = this.mat.finish;
      return arr;
    }

    _build() {
      this._disposeRoot();
      const p = this.params;
      const W = p.largura, D = p.profundidade, N = Math.max(1, Math.round(p.pavimentos));
      const hT = p.peDireitoTerreo, hP = p.peDireito, parapet = p.platibanda;
      const H = hT + (N - 1) * hP + parapet;
      this.dims = { W, D, H };
      this._computeFit();
      const root = this.root = new T.Group(); this.scene.add(root);
      const faceLen = { frente: W, fundos: W, direita: D, esquerda: D };
      const place = (face, t, y, out) => {
        switch (face) {
          case 'frente': return [new T.Vector3(t, y, D / 2 + out), 0];
          case 'fundos': return [new T.Vector3(-t, y, -D / 2 - out), Math.PI];
          case 'direita': return [new T.Vector3(W / 2 + out, y, -t), Math.PI / 2];
          default: return [new T.Vector3(-W / 2 - out, y, t), -Math.PI / 2];
        }
      };
      const unitBox = new T.BoxGeometry(1, 1, 1);
      const m4 = new T.Matrix4(), q = new T.Quaternion(), yAxis = new T.Vector3(0, 1, 0);
      const compose = (pos, rotY, sx, sy, sz) => m4.compose(pos, q.setFromAxisAngle(yAxis, rotY), new T.Vector3(sx, sy, sz)).clone();

      this.floors = []; this.windowMeshes = { frente: [], direita: [], fundos: [], esquerda: [] };
      const faceMats = this._faceMaterials();
      this.wallMeshes = [];

      const levels = [];
      for (let i = 0; i < N; i++) levels.push({ kind: i === 0 ? 'terreo' : 'tipo', h: i === 0 ? hT : hP });
      levels.push({ kind: 'cobertura', h: parapet });
      let y0 = 0;
      levels.forEach((lv, idx) => {
        const floor = new T.Group(); floor.position.y = y0; root.add(floor);
        const solid = new T.Group(); floor.add(solid);
        const wire = new T.Group(); floor.add(wire);
        const h = lv.h;
        // parede
        const wallGeo = worldUV(new T.BoxGeometry(W, h, D).translate(0, h / 2, 0), y0);
        const wall = new T.Mesh(wallGeo, faceMats); wall.castShadow = wall.receiveShadow = true; solid.add(wall); this.wallMeshes.push(wall);
        const lines = [];
        const pushRect = (face, t, yc, w, hh, out) => {
          const c = [[-w / 2, -hh / 2], [w / 2, -hh / 2], [w / 2, hh / 2], [-w / 2, hh / 2]].map(([a, b]) => place(face, t + a, yc + b, out)[0]);
          for (let k = 0; k < 4; k++) lines.push(c[k], c[(k + 1) % 4]);
        };
        if (lv.kind !== 'cobertura') {
          // faixa de laje
          const band = new T.Mesh(new T.BoxGeometry(W + 0.24, 0.22, D + 0.24).translate(0, h - 0.11, 0), this.mat.trim);
          band.castShadow = band.receiveShadow = true; solid.add(band);
          // janelas por fachada
          for (const face of FACES) {
            const len = faceLen[face], frames = [], glass = [];
            if (lv.kind === 'terreo' && face === 'frente') {
              const sw = W * 0.72, sh = h - 1.3;
              frames.push(compose(place(face, 0, 0.2 + sh / 2, 0.03)[0], 0, sw + 0.2, sh + 0.2, 0.1));
              glass.push(compose(place(face, 0, 0.2 + sh / 2, 0.07)[0], 0, sw, sh, 0.06));
              const nm = Math.max(2, Math.round(sw / 1.6));
              for (let k = 1; k < nm; k++) frames.push(compose(place(face, -sw / 2 + (sw * k) / nm, 0.2 + sh / 2, 0.11)[0], 0, 0.07, sh, 0.05));
              frames.push(compose(place(face, 0, 0.2 + sh * 0.78, 0.11)[0], 0, sw, 0.07, 0.05));
              pushRect(face, 0, 0.2 + sh / 2, sw, sh, 0.12);
              const canopy = new T.Mesh(new T.BoxGeometry(W * 0.82, 0.25, 2.2), this.mat.trim);
              canopy.position.copy(place(face, 0, h - 0.75, 1.1)[0]); canopy.castShadow = true; solid.add(canopy);
            } else {
              const n = Math.max(1, Math.round(len / 3.2)), spacing = len / n;
              const ww = Math.min(1.9, spacing * 0.58), wh = Math.min(lv.kind === 'terreo' ? 2.0 : 1.6, h * 0.55);
              const yc = h * 0.3 + wh / 2;
              for (let k = 0; k < n; k++) {
                const t = -len / 2 + spacing * (k + 0.5);
                const [pf, ry] = place(face, t, yc, 0.03);
                frames.push(compose(pf, ry, ww + 0.14, wh + 0.14, 0.1));
                frames.push(compose(place(face, t, yc - wh / 2 - 0.1, 0.06)[0], ry, ww + 0.3, 0.07, 0.16)); // peitoril
                glass.push(compose(place(face, t, yc, 0.07)[0], ry, ww, wh, 0.06));
                frames.push(compose(place(face, t, yc, 0.11)[0], ry, 0.05, wh, 0.04));           // montante central
                frames.push(compose(place(face, t, yc + wh * 0.22, 0.11)[0], ry, ww, 0.045, 0.04)); // travessa
                pushRect(face, t, yc, ww, wh, 0.12);
              }
            }
            const ry = place(face, 0, 0, 0)[1];
            const fm = new T.InstancedMesh(unitBox, this.mat.frame, frames.length);
            frames.forEach((mm, k) => fm.setMatrixAt(k, mm));
            const gm = new T.InstancedMesh(unitBox, this.mat.glass, glass.length);
            glass.forEach((mm, k) => { gm.setMatrixAt(k, mm); });
            fm.castShadow = true; gm.receiveShadow = true; fm.userData.ry = ry;
            solid.add(fm, gm); this.windowMeshes[face].push(fm, gm);
          }
          // sacadas
          if (p.sacadas && lv.kind === 'tipo') {
            const bw = Math.max(2, Math.min(W * 0.62, W - 2));
            const slab = new T.Mesh(new T.BoxGeometry(bw, 0.16, 1.3), this.mat.trim);
            slab.position.copy(place('frente', 0, 0.08, 0.65)[0]); slab.castShadow = slab.receiveShadow = true;
            const rail = new T.Mesh(new T.BoxGeometry(bw, 1.05, 0.03), this.mat.railing);
            rail.position.copy(place('frente', 0, 0.16 + 0.525, 1.28)[0]);
            const hand = new T.Mesh(new T.BoxGeometry(bw, 0.05, 0.07), this.mat.frame);
            hand.position.copy(place('frente', 0, 1.23, 1.28)[0]); hand.castShadow = true;
            solid.add(slab, rail, hand);
            pushRect('frente', 0, 0.6, bw, 1.0, 1.3);
          }
        } else {
          // cobertura: casa de máquinas e reservatório
          const pw = Math.max(2.5, W * 0.34), pd = Math.max(2.5, D * 0.26);
          const house = new T.Mesh(new T.BoxGeometry(pw, 2.6, pd).translate(0, h + 1.3 - 0.4, -D * 0.12), this.mat.existing);
          const tank = new T.Mesh(new T.BoxGeometry(pw * 0.8, 1.4, pd * 0.8).translate(0, h + 2.2 + 0.7 - 0.4 + 0.1, -D * 0.12), this.mat.trim);
          house.castShadow = tank.castShadow = true; solid.add(house, tank);
        }
        // linhas técnicas (arame) do pavimento
        const eg = new T.EdgesGeometry(new T.BoxGeometry(W, h, D).translate(0, h / 2, 0));
        const edges = new T.LineSegments(eg, this.edgeMat); wire.add(edges);
        if (lines.length) wire.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(lines), this.edgeMat));
        this.floors.push({ floor, solid, wire, y0, h });
        y0 += h;
      });

      // planta baixa (desenhada progressivamente)
      const pts = [], P = (x, z) => new T.Vector3(x, 0.03, z);
      const rect = (x0, z0, x1, z1) => { pts.push(P(x0, z0), P(x1, z0), P(x1, z0), P(x1, z1), P(x1, z1), P(x0, z1), P(x0, z1), P(x0, z0)); };
      rect(-W / 2, -D / 2, W / 2, D / 2);
      rect(-W / 2 - 0.25, -D / 2 - 0.25, W / 2 + 0.25, D / 2 + 0.25);
      const nx = Math.max(2, Math.round(W / 5) + 1), nz = Math.max(2, Math.round(D / 5) + 1);
      const xs = Array.from({ length: nx }, (_, i) => -W / 2 + (W * i) / (nx - 1)), zs = Array.from({ length: nz }, (_, i) => -D / 2 + (D * i) / (nz - 1));
      xs.forEach(x => pts.push(P(x, -D / 2 - 2.5), P(x, D / 2 + 2.5)));
      zs.forEach(z => pts.push(P(-W / 2 - 2.5, z), P(W / 2 + 2.5, z)));
      xs.forEach(x => zs.forEach(z => rect(x - 0.2, z - 0.2, x + 0.2, z + 0.2)));
      rect(-W * 0.15, -D * 0.2, W * 0.15, D * 0.05); // núcleo de circulação
      pts.push(P(-W / 2, D * 0.05), P(-W * 0.15, D * 0.05), P(W * 0.15, D * 0.05), P(W / 2, D * 0.05));
      pts.push(P(0, D * 0.05), P(0, D / 2), P(-W / 2, -D * 0.2), P(-W * 0.15, -D * 0.2), P(W * 0.15, -D * 0.2), P(W / 2, -D * 0.2));
      this.planLines = new T.LineSegments(new T.BufferGeometry().setFromPoints(pts), this.planMat);
      this.planCount = pts.length; root.add(this.planLines);

      // cotas
      const dim = this.dimGroup = new T.Group(); root.add(dim);
      const off = 3.5, tick = 0.6, dp = [];
      const line = (a, b) => dp.push(a, b);
      const zd = D / 2 + off, xd = W / 2 + off;
      line(new T.Vector3(-W / 2, 0.05, zd), new T.Vector3(W / 2, 0.05, zd));
      for (const x of [-W / 2, W / 2]) { line(new T.Vector3(x, 0.05, D / 2 + 0.4), new T.Vector3(x, 0.05, zd + 0.6)); line(new T.Vector3(x - tick / 2, 0.05, zd + tick / 2), new T.Vector3(x + tick / 2, 0.05, zd - tick / 2)); }
      line(new T.Vector3(xd, 0.05, -D / 2), new T.Vector3(xd, 0.05, D / 2));
      for (const z of [-D / 2, D / 2]) { line(new T.Vector3(W / 2 + 0.4, 0.05, z), new T.Vector3(xd + 0.6, 0.05, z)); line(new T.Vector3(xd - tick / 2, 0.05, z + tick / 2), new T.Vector3(xd + tick / 2, 0.05, z - tick / 2)); }
      dim.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(dp), this.dimMat));
      const hp = [new T.Vector3(xd, 0, zd), new T.Vector3(xd, H, zd), new T.Vector3(xd - tick / 2, H, zd), new T.Vector3(xd + tick / 2, H, zd), new T.Vector3(xd - tick / 2, 0, zd), new T.Vector3(xd + tick / 2, 0, zd)];
      this.heightDim = new T.Group(); this.heightDim.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(hp), this.dimMat)); dim.add(this.heightDim);
      const lh = Math.max(1.0, this.boundR * 0.075);
      const lw = makeLabel(`Frente ${fmtM(W)}`, lh); lw.position.set(0, 0.2, zd + lh * 0.9); dim.add(lw);
      const ld = makeLabel(`Lateral ${fmtM(D)}`, lh); ld.position.set(xd + lh * 0.9, 0.2, 0); dim.add(ld);
      this.heightLabel = makeLabel(`Altura ${fmtM(H)} · ${N} ${N === 1 ? 'pavimento' : 'pavimentos'}`, lh);
      this.heightLabel.position.set(xd - lh * 0.3, H + lh, zd); this.heightLabel.center.set(1, 0.5); dim.add(this.heightLabel);
      this.labels = [lw, ld, this.heightLabel];

      // entorno: calçada, canteiros, rua e árvores
      const R = this.boundR;
      const site = this.siteGroup = new T.Group(); root.add(site);
      const sw = 3, slab = (w, h, d, x, y, z, mat) => { const g = worldUV(new T.BoxGeometry(w, h, d), 0); const mesh = new T.Mesh(g, mat); mesh.position.set(x, y, z); mesh.receiveShadow = true; site.add(mesh); return mesh; };
      slab(W + sw * 2, 0.12, D + sw * 2, 0, 0.06, 0, this.site.calcada);
      const bedW = 5;
      slab(bedW, 0.1, D + sw * 2, W / 2 + sw + bedW / 2, 0.05, 0, this.site.grama);
      slab(bedW, 0.1, D + sw * 2, -W / 2 - sw - bedW / 2, 0.05, 0, this.site.grama);
      slab(W + sw * 2 + bedW * 2, 0.1, 4, 0, 0.05, -D / 2 - sw - 2, this.site.grama);
      const streetZ = D / 2 + sw + 1.2 + 4, streetL = Math.max(60, R * 6);
      slab(W + sw * 2 + bedW * 2, 0.12, 2.4, 0, 0.06, D / 2 + sw + 1.2, this.site.calcada);
      slab(streetL, 0.04, 8, 0, 0.02, streetZ, this.site.asfalto);
      for (let x = -streetL / 2 + 2; x < streetL / 2; x += 6) slab(2.6, 0.045, 0.15, x, 0.025, streetZ, this.site.faixa);
      const rr = mulberry32(Math.round(W * 13 + D * 7));
      const trunkGeo = new T.CylinderGeometry(0.12, 0.18, 2.4, 8).translate(0, 1.2, 0);
      const crownGeo = new T.IcosahedronGeometry(1.5, 1);
      const shrubGeo = new T.IcosahedronGeometry(0.6, 1);
      const tree = (x, z, s) => { const tr = new T.Mesh(trunkGeo, this.site.tronco); tr.position.set(x, 0.1, z); tr.scale.setScalar(s); tr.castShadow = true; const cr = new T.Mesh(crownGeo, this.site.copa); cr.position.set(x, 0.1 + 3.1 * s, z); cr.scale.set(s, s * (0.9 + rr() * 0.3), s); cr.rotation.y = rr() * 6; cr.castShadow = cr.receiveShadow = true; site.add(tr, cr); };
      for (let x = -W / 2 - sw - bedW + 2; x <= W / 2 + sw + bedW - 2; x += 6.5) if (Math.abs(x) > 3.5) tree(x, D / 2 + sw + 1.2, 0.85 + rr() * 0.35);
      for (const side of [-1, 1]) for (let z = -D / 2; z <= D / 2; z += 5.5) { const b = new T.Mesh(shrubGeo, this.site.arbusto); b.position.set(side * (W / 2 + sw + 1.2 + rr() * 2.5), 0.45, z + rr() * 2); b.scale.set(1 + rr() * 0.6, 0.7 + rr() * 0.4, 1 + rr() * 0.6); b.castShadow = b.receiveShadow = true; site.add(b); }
      tree(W / 2 + sw + bedW / 2, -D / 2 + 2, 1.2); tree(-W / 2 - sw - bedW / 2, -D / 4, 1.05);
      // sombra de contato (oclusão suave junto à base)
      const contact = new T.Mesh(new T.PlaneGeometry(W * 1.45, D * 1.45), this.contactMat);
      contact.rotation.x = -Math.PI / 2; contact.position.y = 0.125; contact.renderOrder = 1; site.add(contact);

      // chão, grade técnica, sol e sombras proporcionais ao prédio
      this.ground.scale.setScalar(R * 3.2);
      if (this.grid) { this.scene.remove(this.grid); this.grid.geometry.dispose(); this.grid.material.dispose(); }
      const gs = Math.ceil((R * 5) / 5) * 5;
      this.grid = new T.GridHelper(gs, Math.round(gs / 2.5), 0x8fdcff, 0x2f78b8);
      this.grid.material.transparent = true; this.grid.material.depthWrite = false; this.grid.position.y = 0.01; this.scene.add(this.grid);
      this.sun.position.set(-R * 0.95, R * 1.2, R * 1.05); this.sun.target.position.set(0, H * 0.25, 0);
      const sc = this.sun.shadow.camera; sc.left = sc.bottom = -R * 1.7; sc.right = sc.top = R * 1.7; sc.near = 0.5; sc.far = R * 6; sc.updateProjectionMatrix();
      this.fill.position.set(R, R * 0.5, -R * 0.6);
      this._applyFinish(false);
      this._applyTimeline(this.tl.playing ? this.tl.p : 1);
    }

    /* ---------- Acabamento, cor e fachadas selecionadas ---------- */
    _applyFinish(animateColor) {
      const p = this.params, s = SURFACE[p.acabamentoTipo] || SURFACE.textura, tex = getSurfaceTexture(p.acabamentoTipo in SURFACE ? p.acabamentoTipo : 'textura');
      const m = this.mat.finish;
      if (m.map !== tex.map) { m.map = tex.map; m.bumpMap = tex.bump; m.needsUpdate = true; }
      m.roughness = s.roughness; m.metalness = s.metalness; m.envMapIntensity = s.env; m.bumpScale = s.bump;
      const target = new T.Color(p.cor);
      if (animateColor && !reducedMotionQuery.matches) this.colorTween = { from: m.color.clone(), to: target, start: performance.now(), dur: 650 };
      else { m.color.copy(target); this.colorTween = null; }
      // pele de vidro cobre as janelas nas fachadas selecionadas
      for (const f of FACES) { const hide = p.acabamentoTipo === 'vidro' && p.faces[f]; (this.windowMeshes?.[f] || []).forEach(mesh => { mesh.visible = !hide; }); }
      if (this.wallMeshes) { const arr = this._faceMaterials(); this.wallMeshes.forEach(w => { w.material = arr; }); }
    }

    /**
     * Atualiza parâmetros. animate: 'full' | 'quick' | 'fit' | 'none'
     */
    setParams(next, { animate = 'fit' } = {}) {
      const prev = this.params; this.params = JSON.parse(JSON.stringify(next));
      const geoKeys = ['largura', 'profundidade', 'pavimentos', 'peDireito', 'peDireitoTerreo', 'platibanda', 'sacadas'];
      const geoChanged = !prev || geoKeys.some(k => prev[k] !== next[k]);
      const facesChanged = prev && FACES.some(f => !!prev.faces[f] !== !!next.faces[f]);
      if (geoChanged) { this._build(); this.play(prev ? animate : 'none'); }
      else { this._applyFinish(true); if (facesChanged) this.pulseStart = performance.now(); }
      if (!this.tl.playing) this.render();
    }

    /* ---------- Linha do tempo ---------- */
    _cameraState() {
      const off = this.camera.position.clone().sub(this.controls.target);
      const s = new T.Spherical().setFromVector3(off);
      return { r: s.radius, phi: s.phi, theta: s.theta, ty: this.controls.target.y };
    }
    _finalCamera(theta) { return { r: this.fitR, phi: 1.3, theta: theta ?? 0.72, ty: this.dims.H * 0.47 }; }

    play(mode = 'full') {
      if (mode === 'none' || ((mode === 'full' || mode === 'quick') && reducedMotionQuery.matches)) {
        // movimento reduzido: vai direto ao estado final
        const theta = this.params && this.camTo ? this._cameraState().theta : 0.72;
        this.tl = { p: 1, mode: 'fit', playing: false, start: 0, dur: 1 };
        this._applyTimeline(1); this._setCamera(this._finalCamera(mode === 'none' && !this.camTo ? 0.72 : theta));
        this.camTo = this._finalCamera(theta); this.controls.enabled = true; this.controls.autoRotate = this.opts.autoRotate && !reducedMotionQuery.matches;
        this.controls.update(); this.render(); this.emit('end', { mode }); return;
      }
      const cur = this._cameraState();
      if (mode === 'full') {
        this.camFrom = { r: this.fitR * 1.08, phi: 0.12, theta: -0.45, ty: 0 };
        this.camTo = this._finalCamera(0.72);
      } else {
        this.camFrom = cur; this.camTo = this._finalCamera(cur.theta);
      }
      const dur = mode === 'full' ? 7200 : mode === 'quick' ? 1800 : 900;
      this.tl = { p: 0, mode, playing: true, start: performance.now(), dur };
      this.controls.enabled = false; this.controls.autoRotate = false;
      this._applyTimeline(0);
      this.emit('start', { mode });
    }
    finish() { if (!this.tl.playing) return; this.tl.p = 1; this._applyTimeline(1); this._end(); }
    _end() {
      this.tl.playing = false; this.controls.enabled = true;
      this.controls.autoRotate = this.opts.autoRotate && !reducedMotionQuery.matches;
      this.controls.update(); this.render(); this.emit('end', { mode: this.tl.mode });
    }
    /** Posiciona a linha do tempo em p (0–1) sem reproduzir — usado em capturas e testes. */
    seek(p, mode = 'full') {
      if (mode === 'full') { this.camFrom = { r: this.fitR * 1.08, phi: 0.12, theta: -0.45, ty: 0 }; this.camTo = this._finalCamera(0.72); }
      this.tl = { p, mode, playing: false, start: 0, dur: 1 };
      this.controls.autoRotate = false; this._applyTimeline(p); this.render();
    }

    _setCamera(c) {
      this.controls.target.set(0, c.ty, 0);
      const v = new T.Vector3().setFromSpherical(new T.Spherical(c.r, c.phi, c.theta));
      this.camera.position.copy(this.controls.target).add(v); this.camera.lookAt(this.controls.target);
    }

    _applyTimeline(p) {
      if (!this.floors) return;
      const mode = this.tl.mode, n = this.floors.length;
      let planP, dimP, reveal, camP, bpMax = 1;
      const wireAt = [], solidAt = [];
      if (mode === 'full') {
        planP = Ease.inOutCubic(seg(p, 0.02, 0.2));
        dimP = Ease.outCubic(seg(p, 0.12, 0.28));
        for (let i = 0; i < n; i++) {
          const a = 0.2 + (i * 0.22) / n; wireAt.push(Ease.outBack(seg(p, a, a + 0.07)));
          const b = 0.42 + (i * 0.28) / n; solidAt.push(Ease.outCubic(seg(p, b, b + 0.09)));
        }
        reveal = Ease.inOutSine(seg(p, 0.6, 0.93));
        camP = Ease.inOutCubic(seg(p, 0.04, 1));
      } else if (mode === 'quick') {
        planP = 1; dimP = 1; bpMax = 0.55;
        for (let i = 0; i < n; i++) {
          const a = (i * 0.3) / n; wireAt.push(Ease.outCubic(seg(p, a, a + 0.15)));
          const b = 0.18 + (i * 0.4) / n; solidAt.push(Ease.outCubic(seg(p, b, b + 0.2)));
        }
        reveal = Ease.inOutSine(seg(p, 0.45, 1));
        camP = Ease.inOutCubic(p);
      } else { // fit / estático
        planP = 1; dimP = 0; reveal = 1; camP = Ease.inOutCubic(p);
        for (let i = 0; i < n; i++) { wireAt.push(1); solidAt.push(1); }
      }
      this.reveal = reveal;
      this.planLines.geometry.setDrawRange(0, Math.floor((this.planCount * planP) / 2) * 2);
      this.planMat.opacity = 0.9 * (1 - reveal);
      this.dimMat.opacity = dimP * (1 - reveal);
      this.labels.forEach(l => { l.material.opacity = dimP * (1 - reveal); l.visible = l.material.opacity > 0.01; });
      const wireTotal = wireAt.reduce((a, b) => a + Math.min(1, b), 0) / n;
      this.heightDim.scale.y = Math.max(0.0001, wireTotal);
      this.heightLabel.position.y = this.dims.H * wireTotal + this.heightLabel.scale.y;
      this.heightLabel.visible = this.heightLabel.visible && wireTotal > 0.6;
      this.dimGroup.visible = dimP * (1 - reveal) > 0.01;
      this.edgeMat.opacity = 0.95 * (1 - reveal);
      this.floors.forEach((f, i) => {
        f.wire.scale.y = Math.max(0.0001, wireAt[i]); f.wire.visible = wireAt[i] > 0.001 && reveal < 0.999;
        f.solid.scale.y = Math.max(0.0001, solidAt[i]); f.solid.visible = solidAt[i] > 0.001;
      });
      // materiais: "fantasma" azul → realista
      if (Math.abs(reveal - this.lastReveal) > 1e-4) {
        for (const m of this.solidMaterials) {
          const base = m.userData.baseOpacity ?? 1;
          m.opacity = lerp(0.2, 1, reveal) * base;
          const transp = m.opacity < 0.999;
          if (m.transparent !== transp) { m.transparent = transp; m.needsUpdate = true; }
        }
        for (const m of [...this.siteMaterials]) { m.opacity = reveal; const tr = reveal < 0.999; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } }
        this.contactMat.opacity = 0.5 * reveal;
        this.lastReveal = reveal;
      }
      if (this.siteGroup) this.siteGroup.visible = reveal > 0.01;
      this.sun.intensity = lerp(0.15, 3.6, reveal);
      this.hemi.intensity = lerp(0.35, 1.0, reveal);
      this.fill.intensity = lerp(0.1, 0.35, reveal);
      this.scene.environmentIntensity = lerp(0.2, 1.0, reveal);
      this.groundMat.opacity = reveal;
      if (this.grid) { this.grid.material.opacity = 0.55 * (1 - reveal); this.grid.visible = reveal < 0.999; }
      if (this.blueprintLayer) this.blueprintLayer.style.opacity = String(bpMax * (1 - reveal) * (mode === 'fit' ? 0 : 1));
      this.container.classList.toggle('is-blueprint', reveal < 0.5 && mode !== 'fit');
      if (this.camFrom && this.camTo && (mode !== 'fit' || this.tl.playing)) {
        const a = this.camFrom, b = this.camTo;
        let dTheta = b.theta - a.theta; if (mode !== 'full') dTheta = Math.atan2(Math.sin(dTheta), Math.cos(dTheta));
        this._setCamera({ r: lerp(a.r, b.r, camP), phi: lerp(a.phi, b.phi, camP), theta: a.theta + dTheta * camP, ty: lerp(a.ty, b.ty, camP) });
      } else if (!this.camTo) {
        this.camTo = this._finalCamera(0.72); this._setCamera(this.camTo);
      }
      this.emit('progress', { p, mode, reveal });
    }

    _tick(now) {
      if (this.tl.playing) {
        const p = clamp01((now - this.tl.start) / this.tl.dur); this.tl.p = p; this._applyTimeline(p);
        if (p >= 1) this._end();
      } else {
        this.controls.update();
      }
      // cor animada e pulso ao alterar fachadas
      const m = this.mat.finish;
      if (this.colorTween) { const k = Ease.inOutSine(clamp01((now - this.colorTween.start) / this.colorTween.dur)); m.color.copy(this.colorTween.from).lerp(this.colorTween.to, k); if (k >= 1) this.colorTween = null; }
      const pulse = Math.max(0, 1 - (now - this.pulseStart) / 900);
      const blue = 1 - (this.reveal ?? 1);
      for (const mm of this.solidMaterials) mm.emissive.copy(this.cyan).multiplyScalar(blue * 0.5);
      if (pulse > 0) m.emissive.add(this.amber.clone().multiplyScalar(Math.sin(pulse * Math.PI) * 0.35));
      this.renderer.render(this.scene, this.camera);
    }

    render() { this._tick(performance.now()); }

    /** Imagem PNG do estado final do modelo, para a proposta. */
    snapshot() {
      if (this.tl.playing) this.finish();
      this.render();
      return this.renderer.domElement.toDataURL('image/png');
    }

    zoomBy(factor) {
      const off = this.camera.position.clone().sub(this.controls.target);
      const r = T.MathUtils.clamp(off.length() * factor, this.controls.minDistance, this.controls.maxDistance);
      this.camera.position.copy(this.controls.target).add(off.setLength(r)); this.controls.update(); this.render();
    }
    resetView() { this.camFrom = this._cameraState(); this.camTo = this._finalCamera(0.72); this.tl = { p: 0, mode: 'fit', playing: true, start: performance.now(), dur: 900 }; this.controls.enabled = false; }
    setAutoRotate(on) { this.controls.autoRotate = on && !reducedMotionQuery.matches; }
  }

  window.ApiceBuilding = { FacadeBuilding, reducedMotionQuery, Ease, surfacePreview: tipo => (tipo in SURFACE ? getSurfaceTexture(tipo).map.image : null) };
})();
