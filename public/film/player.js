/* Eleven11 film player: plays a deterministic film page live on the viewer's GPU.
   The page exposes renderAt(t), END, READY, setFrameSize(w, h); optional AUDIO_SRC, POSTER_T, FILM_NAME. */
(function () {
  const css = `
  html,body{margin:0;height:100%;background:#000;overflow:hidden;cursor:default}
  #out{position:absolute;display:block}
  .fp-big{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:18px;background:radial-gradient(ellipse at center,rgba(0,0,0,.15),rgba(0,0,0,.7));cursor:pointer;z-index:5;transition:opacity .35s}
  .fp-big.hide{opacity:0;pointer-events:none}
  .fp-big b{width:92px;height:92px;border-radius:50%;background:#ff5a1f;display:flex;align-items:center;justify-content:center;box-shadow:0 0 60px rgba(255,90,31,.45)}
  .fp-big b:after{content:'';margin-left:8px;border-left:30px solid #111;border-top:19px solid transparent;border-bottom:19px solid transparent}
  .fp-big span{font:700 13px/1 ui-monospace,"SF Mono",Menlo,monospace;letter-spacing:.22em;color:#e9e6df}
  .fp-bar{position:absolute;left:0;right:0;bottom:0;padding:14px 18px 16px;display:flex;align-items:center;gap:14px;background:linear-gradient(transparent,rgba(0,0,0,.85));font:700 11px/1 ui-monospace,"SF Mono",Menlo,monospace;letter-spacing:.14em;color:#cbc8c1;z-index:6;transition:opacity .4s}
  .fp-bar.idle{opacity:0}
  .fp-bar button{all:unset;cursor:pointer;padding:7px 9px;border:1px solid #3a3a3d;border-radius:4px;color:#cbc8c1;background:#121214}
  .fp-bar button.on{border-color:#ff5a1f;color:#ff5a1f}
  .fp-bar button:hover{border-color:#77746e}
  .fp-bar input[type=range]{flex:1;accent-color:#ff5a1f;height:4px;cursor:pointer}
  .fp-bar .t{min-width:110px;text-align:center;color:#e9e6df}
  .fp-bar a{color:#77746e;text-decoration:none;padding:7px 4px}
  .fp-bar a.cur{color:#ff5a1f}
  .fp-fps{position:absolute;right:14px;top:12px;font:600 10px/1 ui-monospace,Menlo,monospace;color:#55534e;letter-spacing:.1em;z-index:6}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  if (new URLSearchParams(location.search).has('w')) return; // frame-render mode: leave the page alone
  function wait() { if (window.READY && window.setFrameSize) init(); else setTimeout(wait, 60); }
  document.readyState === 'loading' ? addEventListener('DOMContentLoaded', wait) : wait();

  function init() {
    const out = document.getElementById('out'), END = window.END, FPS = window.FPS || 30;
    let t = window.POSTER_T ?? END * .4, playing = false, loop = true, dirty = true, scale = Math.min(devicePixelRatio || 1, 1.5), muted = false;
    const audio = window.AUDIO_SRC ? new Audio(window.AUDIO_SRC) : null; if (audio) audio.preload = 'auto';

    // UI
    const big = document.createElement('div'); big.className = 'fp-big'; big.innerHTML = `<b></b><span>PLAY ${(window.FILM_NAME || 'FILM').toUpperCase()}</span>`; document.body.appendChild(big);
    const bar = document.createElement('div'); bar.className = 'fp-bar';
    const films = [['transitions', 'TRANSITIONS'], ['radio', '08 RADIO'], ['logo', 'CARVED LOGO']], here = location.pathname.split('/').pop().replace('.html', '');
    bar.innerHTML = `<button data-k="play">PLAY</button><span class="t">00:00.00</span><input type="range" min="0" max="${END}" step="${1 / FPS}" value="0">
      <button data-k="loop" class="on">LOOP</button>${audio ? '<button data-k="snd" class="on">SOUND</button>' : ''}<button data-k="hq">HQ</button><button data-k="fs">FULL</button>
      <span style="color:#3a3a3d">|</span>${films.map(([k, n]) => `<a href="${k}" class="${k === here ? 'cur' : ''}">${n}</a>`).join('')}`;
    document.body.appendChild(bar);
    const fpsEl = document.createElement('div'); fpsEl.className = 'fp-fps'; document.body.appendChild(fpsEl);
    const $ = k => bar.querySelector(`[data-k="${k}"]`), range = bar.querySelector('input'), tEl = bar.querySelector('.t');
    const fmt = s => { const m = Math.floor(s / 60), r = s - m * 60; return String(m).padStart(2, '0') + ':' + r.toFixed(2).padStart(5, '0'); };

    function fit() { const w = innerWidth, h = innerHeight; if (!w || !h) { setTimeout(fit, 250); return; } let cw = w, ch = Math.round(w * 9 / 16); if (ch > h) { ch = h; cw = Math.round(h * 16 / 9); }
      Object.assign(out.style, { width: cw + 'px', height: ch + 'px', left: ((w - cw) / 2) + 'px', top: ((h - ch) / 2) + 'px' });
      window.setFrameSize(Math.round(cw * scale), Math.round(ch * scale)); $('hq').classList.toggle('on', scale > 1.01); dirty = true; }
    addEventListener('resize', fit); fit();

    function syncAudio() { if (!audio) return; if (playing && !muted) { audio.currentTime = t; audio.play().catch(() => { }); } else audio.pause(); }
    function setPlay(p) { playing = p; $('play').textContent = p ? 'PAUSE' : 'PLAY'; big.classList.add('hide'); syncAudio(); last = performance.now(); }
    function seek(v) { t = Math.max(0, Math.min(END - 1e-3, v)); dirty = true; if (audio && playing && !muted) audio.currentTime = t; }

    big.onclick = () => { seek(t >= END * .35 && !playing && t === (window.POSTER_T ?? END * .4) ? 0 : t); setPlay(true); };
    $('play').onclick = () => setPlay(!playing);
    $('loop').onclick = () => { loop = !loop; $('loop').classList.toggle('on', loop); };
    if (audio) $('snd').onclick = () => { muted = !muted; $('snd').classList.toggle('on', !muted); syncAudio(); };
    $('hq').onclick = () => { scale = scale > 1.01 ? 1 : Math.min(devicePixelRatio || 1, 2); fit(); };
    $('fs').onclick = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    range.oninput = () => seek(+range.value);
    addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); setPlay(!playing); } else if (e.code === 'ArrowRight') { setPlay(false); seek(t + 1 / FPS); } else if (e.code === 'ArrowLeft') { setPlay(false); seek(t - 1 / FPS); }
      else if (e.key === 'f') $('fs').click(); else if (e.key === 'l') $('loop').click(); else if (e.key === 'm' && audio) $('snd').click(); });
    let idleT = 0; addEventListener('mousemove', () => { idleT = performance.now(); bar.classList.remove('idle'); document.body.style.cursor = 'default'; });

    let last = performance.now(), frames = [], adapted = false;
    function tick(now) {
      const dt = Math.min(.1, (now - last) / 1000); last = now;
      if (playing) {
        if (audio && !muted && !audio.paused && audio.readyState >= 2) { const at = audio.currentTime; t = Math.abs(at - t) < .25 ? at : t + dt; } else t += dt;
        if (t >= END) { if (loop) { t = 0; if (audio && !muted) { audio.currentTime = 0; audio.play().catch(() => { }); } } else { t = END - 1e-3; setPlay(false); } }
        dirty = true;
        frames.push(dt); if (frames.length > 120) frames.shift();
        if (!adapted && frames.length >= 90) { const s = [...frames].sort((a, b) => a - b), med = s[s.length >> 1]; adapted = true; if (med > .026 && scale > 1) { scale = 1; fit(); } } // keep it smooth on slower machines
      }
      if (dirty) { window.renderAt(t, 1); range.value = t; tEl.textContent = fmt(t) + ' / ' + fmt(END); dirty = false; }
      if (frames.length > 10) { const avg = frames.reduce((a, b) => a + b, 0) / frames.length; fpsEl.textContent = playing ? Math.round(1 / avg) + ' FPS' : ''; }
      if (playing && now - idleT > 2200) { bar.classList.add('idle'); document.body.style.cursor = 'none'; }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
})();
