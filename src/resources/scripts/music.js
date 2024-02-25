const nodes = document.querySelectorAll('.player');
const main = document.querySelector('.bcplayer');

let iframe;
function attach(track) {
  if (!iframe) {
    iframe = document.createElement('iframe');
    setTimeout(() => main.appendChild(iframe), 260);
  }

  const props = [
    track.album ? `album=${track.album}` : '',
    track.track ? `track=${track.track}` : '',
    'artwork=none',
    'size=small',
    'bgcol=222222',
    'linkcol=ffffff',
    'transparent=true',
  ].filter(Boolean).join('/');

  iframe.src = `https://bandcamp.com/EmbeddedPlayer/${props}/`;
  track.node.disabled = true;
}

function dispose(track) {
  track.node.disabled = false;
  iframe.remove();
  iframe = null;
}

let currentTrack;
nodes.forEach(node => {
  node.addEventListener('click', () => {
    if (currentTrack) dispose(currentTrack);
    currentTrack = { node, ...JSON.parse(node.dataset.track) };
    attach(currentTrack);
  });
});
