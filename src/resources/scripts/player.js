const node = document.querySelector('#soundcloud');

const sets = [
  [1, 1732830858, 'C62418', 120],
  [1, 1731802713, '385454', 120],
  [0, 1764318402, '9e9484', 350],
  [0, 1763400378, 'FC8088', 350],
  [1, 1718441316, 'e1996f', 120],
  [1, 1716818856, '050507', 120],
  [1, 1714879050, 'bebcbb', 120],
  [1, 1712370732, '273134', 120],
  [0, 1752866826, 'F79C41', 350],
  [0, 1749178398, '32A39D', 350],
  [0, 1750065801, 'FE09A0', 600],
];

let current = Math.floor(Math.random() * sets.length);
function refresh() {
  current = current === sets.length - 1 ? 0 : current + 1;

  const [is_track, playlist, color, height] = sets[current];

  const kind = is_track ? 'tracks' : 'playlists';
  const url = `https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/${kind}/${playlist}&color=%23${color}&auto_play=false&hide_related=true&show_comments=true&show_user=false&show_reposts=false&show_teaser=true`;

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
