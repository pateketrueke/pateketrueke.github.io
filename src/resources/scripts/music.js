// ── WAVE CANVAS + PARALLAX ─────────────────────────────────
const canvas = document.getElementById('waveCanvas');
const ctx = canvas.getContext('2d');
const scene = document.getElementById('scene');
const layer = document.getElementById('layer-mid');

let W, H, t = 0, mx = 0.5, my = 0.5, tx = 0.5, ty = 0.5;

function resize() {
  W = canvas.width  = scene.clientWidth;
  H = canvas.height = scene.clientHeight;
}
resize();
window.addEventListener('resize', resize);

scene.addEventListener('mousemove', e => {
  const r = scene.getBoundingClientRect();
  tx = (e.clientX - r.left) / r.width;
  ty = (e.clientY - r.top)  / r.height;
});

const waves = [
  { s: 0.28, a: 28, f: 0.009, al: 0.08, w: 1.5, o: 0,   c: '#00FF88' },
  { s: 0.45, a: 16, f: 0.016, al: 0.04, w: 1,   o: 55,  c: '#38bdf8' },
  { s: 0.20, a: 38, f: 0.006, al: 0.03, w: 2,   o: -45, c: '#00FF88' },
  { s: 0.60, a: 11, f: 0.025, al: 0.04, w: 0.8, o: 28,  c: '#a78bfa' },
  { s: 0.35, a: 22, f: 0.012, al: 0.03, w: 1.2, o: -65, c: '#38bdf8' },
];

function draw() {
  ctx.clearRect(0, 0, W, H);
  const cy = H * 0.5;
  waves.forEach(l => {
    ctx.beginPath();
    ctx.strokeStyle = l.c;
    ctx.globalAlpha = l.al;
    ctx.lineWidth   = l.w;
    for (let x = 0; x <= W; x += 2) {
      const y = cy + l.o
        + Math.sin(x * l.f + t * l.s) * l.a
        + Math.sin(x * l.f * 1.6 + t * l.s * 0.7) * l.a * 0.3;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
}

function loop() {
  t += 0.008;
  mx += (tx - mx) * 0.05;
  my += (ty - my) * 0.05;
  draw();
  const dx = (mx - 0.5) * 2;
  const dy = (my - 0.5) * 2;
  layer.style.transform = `translate(${dx * -6}px, ${dy * -3}px)`;
  requestAnimationFrame(loop);
}
loop();

// ── BANDCAMP PLAYER ────────────────────────────────────────
const bcMain = document.querySelector('.bcplayer');
let iframe, currentBtn;

document.querySelectorAll('.player').forEach(btn => {
  btn.addEventListener('click', () => {
    if (currentBtn) currentBtn.disabled = false;
    if (currentBtn === btn && iframe) {
      iframe.remove();
      iframe = null;
      currentBtn = null;
      return;
    }
    currentBtn = btn;
    btn.disabled = true;

    const track = JSON.parse(btn.dataset.track);
    if (!iframe) {
      iframe = document.createElement('iframe');
      setTimeout(() => bcMain.appendChild(iframe), 260);
    }

    const props = [
      track.album ? `album=${track.album}` : '',
      track.track ? `track=${track.track}` : '',
      'artwork=none',
      'size=small',
      'bgcol=070709',
      'linkcol=00FF88',
      'transparent=true',
    ].filter(Boolean).join('/');

    iframe.src = `https://bandcamp.com/EmbeddedPlayer/${props}/`;
    iframe.style.cssText = 'border:0;width:100%;height:120px;';
  });
});

// ── MEDIA KIT MODAL ────────────────────────────────────────
const modal    = document.getElementById('modal');
const mPreview = document.getElementById('modal-preview');
const mName    = document.getElementById('modal-name');
const mType    = document.getElementById('modal-type');
const mDl      = document.getElementById('modal-dl');

document.querySelectorAll('.kit-item').forEach(item => {
  item.addEventListener('click', () => {
    const { src, name, ext } = item.dataset;
    mName.textContent = name;
    mType.textContent = ext;
    mDl.href = src;
    mDl.setAttribute('download', name.toLowerCase().replace(/ /g, '_') + '.' + ext.toLowerCase());
    mPreview.innerHTML = `<img src="${src}" alt="${name}">`;
    modal.classList.add('open');
  });
});

function closeModal() {
  modal.classList.remove('open');
  mPreview.innerHTML = '';
}

document.getElementById('modal-close').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
