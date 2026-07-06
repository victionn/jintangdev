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

  const FRAG = `
    precision highp float;
    uniform vec2 resolution;
    uniform float time;
    uniform float xScale;
    uniform float yScale;
    uniform float distortion;

    void main() {
      vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);

      float d = length(p) * distortion;

      float rx = p.x * (1.0 + d);
      float gx = p.x;
      float bx = p.x * (1.0 - d);

      float r = 0.05 / abs(p.y + sin((rx + time) * xScale) * yScale);
      float g = 0.05 / abs(p.y + sin((gx + time) * xScale) * yScale);
      float b = 0.05 / abs(p.y + sin((bx + time) * xScale) * yScale);

      gl_FragColor = vec4(r, g, b, 1.0);
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
  gl.uniform1f(gl.getUniformLocation(program, 'xScale'), 1.0);
  gl.uniform1f(gl.getUniformLocation(program, 'yScale'), 0.5);
  gl.uniform1f(gl.getUniformLocation(program, 'distortion'), 0.05);

  let time = 0;
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
