/* ==========================================================================
   WebGL image layer (Three.js r128)

   Every element with [data-gl] gets a plane on one fixed canvas behind the
   page. Each frame the plane is moved/scaled to match the element's
   on-screen rectangle, so GSAP can animate the DOM element and the image
   follows.

   Per-element attributes:
     data-kind   0 portrait · 1 texture · 2 light streak · 3 water
                 (only used for the procedural placeholder)
     data-seed   any number, varies the placeholder
     data-tone   0 (dark) – 1 (light)
     data-z      draw order (higher draws on top)
   The element's CSS variable --reveal (0–1) wipes the image in from the left,
   and its inline opacity fades it.

   Real photos: put <img src="..."> inside the element. It becomes the
   texture and is graded to the site's green duotone.
   ========================================================================== */
window.GL = (function () {
  "use strict";

  const api = { enabled: false, velocity: 0, refresh: function () {} };
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (typeof THREE === "undefined" || reduce) return api;

  const canvas = document.createElement("canvas");
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  } catch (e) { return api; }
  if (!renderer.getContext()) return api;

  canvas.className = "gl-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);
  document.documentElement.classList.add("gl-on");
  api.enabled = true;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, 1, 0, 1, -100, 100);
  const geometry = new THREE.PlaneGeometry(1, 1, 24, 24);

  const vertex = `
    uniform float uVel;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      vec4 wp = modelMatrix * vec4(position, 1.0);
      wp.y += sin(uv.x * 3.14159) * uVel;          // bend with scroll speed
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`;

  const fragment = `
    precision highp float;
    uniform float uTime, uHover, uVel, uReveal, uOpacity, uSeed, uTone, uKind, uHasTex;
    uniform vec2 uMouse, uRes, uImg;
    uniform sampler2D uTex;
    uniform vec3 uDark, uLight;
    varying vec2 vUv;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }

    vec2 cover(vec2 uv) {
      float rs = uRes.x / uRes.y, ri = uImg.x / uImg.y;
      vec2 s = rs < ri ? vec2(rs / ri, 1.0) : vec2(1.0, ri / rs);
      return (uv - 0.5) * s + 0.5;
    }

    // procedural placeholder "photographs"
    float scene(vec2 uv) {
      vec2 p = uv * vec2(uRes.x / uRes.y, 1.0) * 2.0 + uSeed * 7.31;
      float t = uTime * 0.04;
      if (uKind < 0.5) {                    // portrait: soft window light, darker mass below
        float g = fbm(p * 1.3 + t);
        float light = smoothstep(1.1, 0.0, distance(uv, vec2(0.3, 0.9)));
        float body = smoothstep(0.6, 0.0, distance(uv * vec2(1.0, 1.5), vec2(0.55, 0.2)));
        return clamp(0.22 + light * 0.6 + g * 0.22 - body * 0.4, 0.0, 1.0);
      } else if (uKind < 1.5) {             // texture: foliage / metal / grain
        float g = fbm(p * 1.5 + vec2(t, -t));
        float v = smoothstep(0.38, 0.78, fbm(p * 2.6 + g * 2.2));
        return 0.06 + v * 0.62 + g * 0.08;
      } else if (uKind < 2.5) {             // light streak
        vec2 q = uv - vec2(0.12, 0.62);
        float ang = atan(q.y, q.x);
        float rays = fbm(vec2(ang * 5.0, length(q) * 1.2 - uTime * 0.06) + uSeed);
        float core = smoothstep(0.7, 0.0, length(q));
        return clamp(0.04 + pow(rays, 3.0) * 1.7 + core * rays * 0.5, 0.0, 1.0);
      }
      float w = fbm(vec2(p.x * 3.0, p.y * 7.0) + vec2(t * 2.0, t * 3.0));   // water
      float spark = smoothstep(0.74, 0.84, fbm(p * 8.0 + t * 3.0));
      return 0.08 + w * 0.34 + spark * 0.55;
    }

    void main() {
      vec2 uv = vUv;
      float d = distance(uv, uMouse);
      uv += (uv - uMouse) * sin(d * 26.0 - uTime * 3.0) * 0.014 * uHover * smoothstep(0.5, 0.0, d);   // hover ripple
      vec2 zuv = (uv - 0.5) * mix(1.22, 1.0, uReveal) + 0.5;                                               // settle zoom
      float shift = clamp(abs(uVel) * 0.0012, 0.0, 0.012) + uHover * 0.0025;                              // chroma split

      vec3 col;
      if (uHasTex > 0.5) {
        vec2 c = cover(zuv);
        vec3 tex = vec3(texture2D(uTex, c + vec2(shift, 0.0)).r, texture2D(uTex, c).g, texture2D(uTex, c - vec2(shift, 0.0)).b);
        float l = dot(tex, vec3(0.299, 0.587, 0.114));
        col = mix(mix(uDark, uLight, l), tex, 0.12);
      } else {
        float a = scene(zuv + vec2(shift, 0.0)), b = scene(zuv - vec2(shift, 0.0));
        float l = clamp((a + b) * 0.5 + (uTone - 0.5) * 0.45, 0.0, 1.0);
        col = mix(uDark, uLight, l);
        col.r += (a - b) * 0.12; col.b -= (a - b) * 0.12;
      }
      col *= mix(0.8, 1.0, smoothstep(1.1, 0.35, distance(vUv, vec2(0.5))));   // vignette
      col += (hash(vUv * uRes + fract(uTime) * 91.0) - 0.5) * 0.07;            // film grain
      float mask = step(vUv.x, uReveal);
      gl_FragColor = vec4(col, uOpacity * mask);
    }`;

  const DARK = new THREE.Color("#0f1612");
  const LIGHT = new THREE.Color("#dcd8cc");
  const loader = new THREE.TextureLoader();
  const items = [];
  const pointer = { x: -9999, y: -9999 };
  let W = window.innerWidth, H = window.innerHeight;

  function add(el) {
    if (el._gl) return;
    const material = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: true,
      depthTest: false,
      uniforms: {
        uTime: { value: 0 }, uHover: { value: 0 }, uVel: { value: 0 }, uReveal: { value: 1 }, uOpacity: { value: 1 },
        uSeed: { value: parseFloat(el.dataset.seed || Math.random() * 10) },
        uTone: { value: parseFloat(el.dataset.tone || 0.5) },
        uKind: { value: parseFloat(el.dataset.kind || 0) },
        uHasTex: { value: 0 }, uTex: { value: null },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) }, uRes: { value: new THREE.Vector2(1, 1) }, uImg: { value: new THREE.Vector2(1, 1) },
        uDark: { value: DARK }, uLight: { value: LIGHT }
      }
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = parseInt(el.dataset.z || 0, 10);
    scene.add(mesh);

    const img = el.querySelector("img");
    if (img && img.getAttribute("src")) {
      loader.load(img.currentSrc || img.src, (tex) => {
        tex.minFilter = THREE.LinearFilter;
        material.uniforms.uTex.value = tex;
        material.uniforms.uImg.value.set(tex.image.width, tex.image.height);
        material.uniforms.uHasTex.value = 1;
      }, undefined, () => { img.style.opacity = 1; });  // e.g. opened from file:// — show the <img> instead
    }
    el._gl = { mesh, material, hover: 0 };
    items.push(el);
  }

  function scan() { document.querySelectorAll("[data-gl]").forEach(add); }

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    renderer.setSize(W, H, false);
    camera.left = 0; camera.right = W; camera.top = 0; camera.bottom = -H;
    camera.updateProjectionMatrix();
  }

  function render(time) {
    const vel = Math.max(-40, Math.min(40, api.velocity)) * 0.6;
    for (let i = 0; i < items.length; i++) {
      const el = items[i], g = el._gl, u = g.material.uniforms;
      if (el.dataset.kind !== undefined) u.uKind.value = parseFloat(el.dataset.kind);
      if (el.dataset.seed !== undefined) u.uSeed.value = parseFloat(el.dataset.seed);
      const r = el.getBoundingClientRect();
      const visible = r.width > 0 && r.height > 0 && r.bottom > -50 && r.top < H + 50 && r.right > -50 && r.left < W + 50;
      g.mesh.visible = visible;
      if (!visible) continue;

      g.mesh.position.set(r.left + r.width / 2, -(r.top + r.height / 2), 0);
      g.mesh.scale.set(r.width, r.height, 1);

      const inside = pointer.x >= r.left && pointer.x <= r.right && pointer.y >= r.top && pointer.y <= r.bottom;
      g.hover += ((inside ? 1 : 0) - g.hover) * 0.08;
      if (inside) u.uMouse.value.set((pointer.x - r.left) / r.width, 1 - (pointer.y - r.top) / r.height);

      const reveal = parseFloat(el.style.getPropertyValue("--reveal"));
      const op = el.style.opacity === "" ? 1 : parseFloat(el.style.opacity);
      u.uReveal.value = isNaN(reveal) ? 1 : reveal;
      u.uOpacity.value = op;
      u.uHover.value = g.hover;
      u.uVel.value = vel;
      u.uTime.value = time;
      u.uRes.value.set(r.width, r.height);
    }
    renderer.render(scene, camera);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", (e) => { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });
  resize();
  scan();

  api.refresh = scan;
  api.render = render;
  return api;
})();
