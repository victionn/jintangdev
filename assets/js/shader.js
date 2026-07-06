/* Aurora shader — WebGL port of web-gl-shader.tsx (identical GLSL).
   Renders chromatic sine ribbons behind the hero. Pauses when the hero
   is off-screen or the tab is hidden; renders a single static frame
   when the user prefers reduced motion. */
(function () {
  const canvas = document.getElementById('shader-canvas');
  if (!canvas) return;

  const gl = canvas.getContext('webgl', { antialias: true, alpha: false })
          || canvas.getContext('experimental-webgl');
  if (!gl) { canvas.style.display = 'none'; return; }

  const VERT = `
    attribute vec3 position;
    void main() {
      gl_Position = vec4(position, 1.0);
    }
  `;

  /* Aurora curtains: layered fbm noise builds swaying curtains of light
     with fine vertical rays, tinted sky-blue -> periwinkle to match the
     site's ice theme. */
  const FRAG = `
    precision highp float;
    uniform vec2 resolution;
    uniform float time;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i),                   hash(i + vec2(1.0, 0.0)), u.x),
                 mix(hash(i + vec2(0.0, 1.0)),  hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 3; i++) {
        v += a * noise(p);
        p = p * 2.03 + vec2(11.7, 5.3);
        a *= 0.5;
      }
      return v;
    }

    void main() {
      vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
      float t = time;

      vec3 col = vec3(0.008, 0.010, 0.022); // near-black blue night sky

      for (int i = 0; i < 3; i++) {
        float fi = float(i);
        float speed = 0.22 + fi * 0.11;
        float off = fi * 9.17;

        // curtains bend: x warped by y-dependent drifting noise
        float sway = (fbm(vec2(p.y * 0.9 + off, t * speed)) - 0.5) * 1.2;
        float x = p.x * (1.3 + fi * 0.25) + sway + off;

        // the curtain folds (bright/dark columns)
        float fold = fbm(vec2(x * 1.8, t * speed * 0.7 + off));
        float curtain = pow(smoothstep(0.32, 0.78, fold), 1.6);

        // fine vertical rays shimmering inside each curtain
        float rays = 0.6 + 0.5 * noise(vec2(x * 22.0, t * speed * 2.0));
        curtain *= rays;

        // vertical placement of the band, slowly drifting per layer
        float cy = 0.05 + (fbm(vec2(x * 0.6, t * 0.18 + off)) - 0.5) * 1.1;
        float band = exp(-pow((p.y - cy) * (1.2 + fi * 0.35), 2.0));

        float g = curtain * band * (1.5 - fi * 0.35);

        vec3 tint = mix(vec3(0.49, 0.83, 0.99),   // sky   #7dd3fc
                        vec3(0.65, 0.71, 0.99),   // peri  #a5b4fc
                        0.5 + 0.5 * sin(fi * 2.1 + p.y * 1.5 + t * 0.15));
        col += g * tint;
      }

      // faint ambient glow high in the "sky"
      col += vec3(0.05, 0.09, 0.16) * exp(-pow((p.y - 0.55) * 1.4, 2.0)) * 0.35;

      // calm the center so hero text stays readable; edges keep full glow
      float cd = length(p * vec2(0.75, 0.95));
      col *= 0.35 + 0.65 * smoothstep(0.1, 1.05, cd);

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) { canvas.style.display = 'none'; return; }

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.useProgram(program);

  // Fullscreen quad (two triangles)
  const positions = new Float32Array([
    -1, -1, 0,   1, -1, 0,   -1, 1, 0,
     1, -1, 0,  -1,  1, 0,    1, 1, 0,
  ]);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
  const posLoc = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

  const uResolution = gl.getUniformLocation(program, 'resolution');
  const uTime       = gl.getUniformLocation(program, 'time');

  let time = 30; // start mid-flow so the first (or reduced-motion) frame shows developed curtains
  let rafId = null;
  let inView = true;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.75);

  function resize() {
    const w = Math.floor(canvas.clientWidth * dpr);
    const h = Math.floor(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2fv(uResolution, [w, h]);
    }
  }

  function draw() {
    gl.uniform1f(uTime, time);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function frame() {
    time += 0.01;
    draw();
    rafId = requestAnimationFrame(frame);
  }

  function play() {
    if (rafId === null && !reducedMotion) rafId = requestAnimationFrame(frame);
  }
  function pause() {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  }

  resize();
  draw(); // always paint at least one frame

  if (!reducedMotion) {
    play();

    // Save GPU/battery when the hero is scrolled away or the tab is hidden
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        if (inView && !document.hidden) play(); else pause();
      }, { threshold: 0 }).observe(canvas);
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) pause(); else if (inView) play();
    });
  }

  window.addEventListener('resize', function () { resize(); draw(); });
})();
