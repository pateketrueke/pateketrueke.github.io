const node = document.querySelector('#soundcloud');

const sets = [
  [1752201033, '35658D', 350],
  [1752866826, 'F79C41', 350],
  [1749178398, '32A39D', 350],
  [1750065801, 'FE09A0', 600],
];

let current = Math.floor(Math.random() * sets.length);
function refresh() {
  current = current === sets.length - 1 ? 0 : current + 1;

  const [playlist, color, height] = sets[current];

  const url = `https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/playlists/${playlist}&color=%23${color}&auto_play=false&hide_related=true&show_comments=true&show_user=false&show_reposts=false&show_teaser=true`;

  node.innerHTML = `<iframe width="100%" height="${height}" scrolling="no" frameborder="no" allow="autoplay" src="${url}"></iframe>`;

  const btn = document.createElement('button');

  btn.textContent = 'Load next playlist...';
  node.appendChild(btn);
  btn.onclick = () => {
    refresh();
    scrollTo(0, document.body.scrollHeight);
  };
}
requestAnimationFrame(refresh);
