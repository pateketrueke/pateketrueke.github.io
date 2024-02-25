// src/resources/scripts/src/resources/scripts/music.js
var nodes = document.querySelectorAll(".player");
var main = document.querySelector(".bcplayer");
var iframe;
function attach(track) {
  if (!iframe) {
    iframe = document.createElement("iframe");
    setTimeout(() => main.appendChild(iframe), 260);
  }
  const props = [
    track.album ? `album=${track.album}` : "",
    track.track ? `track=${track.track}` : "",
    "artwork=none",
    "size=small",
    "bgcol=222222",
    "linkcol=ffffff",
    "transparent=true"
  ].filter(Boolean).join("/");
  iframe.src = `https://bandcamp.com/EmbeddedPlayer/${props}/`;
  track.node.disabled = true;
}
function dispose(track) {
  track.node.disabled = false;
  iframe.remove();
  iframe = null;
}
var currentTrack;
nodes.forEach((node) => {
  node.addEventListener("click", () => {
    if (currentTrack)
      dispose(currentTrack);
    currentTrack = { node, ...JSON.parse(node.dataset.track) };
    attach(currentTrack);
  });
});
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL3Jlc291cmNlcy9zY3JpcHRzL3NyYy9yZXNvdXJjZXMvc2NyaXB0cy9tdXNpYy5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3Qgbm9kZXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcucGxheWVyJyk7XG5jb25zdCBtYWluID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmJjcGxheWVyJyk7XG5cbmxldCBpZnJhbWU7XG5mdW5jdGlvbiBhdHRhY2godHJhY2spIHtcbiAgaWYgKCFpZnJhbWUpIHtcbiAgICBpZnJhbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpZnJhbWUnKTtcbiAgICBzZXRUaW1lb3V0KCgpID0+IG1haW4uYXBwZW5kQ2hpbGQoaWZyYW1lKSwgMjYwKTtcbiAgfVxuXG4gIGNvbnN0IHByb3BzID0gW1xuICAgIHRyYWNrLmFsYnVtID8gYGFsYnVtPSR7dHJhY2suYWxidW19YCA6ICcnLFxuICAgIHRyYWNrLnRyYWNrID8gYHRyYWNrPSR7dHJhY2sudHJhY2t9YCA6ICcnLFxuICAgICdhcnR3b3JrPW5vbmUnLFxuICAgICdzaXplPXNtYWxsJyxcbiAgICAnYmdjb2w9MjIyMjIyJyxcbiAgICAnbGlua2NvbD1mZmZmZmYnLFxuICAgICd0cmFuc3BhcmVudD10cnVlJyxcbiAgXS5maWx0ZXIoQm9vbGVhbikuam9pbignLycpO1xuXG4gIGlmcmFtZS5zcmMgPSBgaHR0cHM6Ly9iYW5kY2FtcC5jb20vRW1iZWRkZWRQbGF5ZXIvJHtwcm9wc30vYDtcbiAgdHJhY2subm9kZS5kaXNhYmxlZCA9IHRydWU7XG59XG5cbmZ1bmN0aW9uIGRpc3Bvc2UodHJhY2spIHtcbiAgdHJhY2subm9kZS5kaXNhYmxlZCA9IGZhbHNlO1xuICBpZnJhbWUucmVtb3ZlKCk7XG4gIGlmcmFtZSA9IG51bGw7XG59XG5cbmxldCBjdXJyZW50VHJhY2s7XG5ub2Rlcy5mb3JFYWNoKG5vZGUgPT4ge1xuICBub2RlLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgIGlmIChjdXJyZW50VHJhY2spIGRpc3Bvc2UoY3VycmVudFRyYWNrKTtcbiAgICBjdXJyZW50VHJhY2sgPSB7IG5vZGUsIC4uLkpTT04ucGFyc2Uobm9kZS5kYXRhc2V0LnRyYWNrKSB9O1xuICAgIGF0dGFjaChjdXJyZW50VHJhY2spO1xuICB9KTtcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFBLElBQU0sUUFBUSxTQUFTLGlCQUFpQixTQUFTO0FBQ2pELElBQU0sT0FBTyxTQUFTLGNBQWMsV0FBVztBQUUvQyxJQUFJO0FBQ0osU0FBUyxPQUFPLE9BQU87QUFDckIsTUFBSSxDQUFDLFFBQVE7QUFDWCxhQUFTLFNBQVMsY0FBYyxRQUFRO0FBQ3hDLGVBQVcsTUFBTSxLQUFLLFlBQVksTUFBTSxHQUFHLEdBQUc7QUFBQSxFQUNoRDtBQUVBLFFBQU0sUUFBUTtBQUFBLElBQ1osTUFBTSxRQUFRLFNBQVMsTUFBTSxLQUFLLEtBQUs7QUFBQSxJQUN2QyxNQUFNLFFBQVEsU0FBUyxNQUFNLEtBQUssS0FBSztBQUFBLElBQ3ZDO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLEVBQ0YsRUFBRSxPQUFPLE9BQU8sRUFBRSxLQUFLLEdBQUc7QUFFMUIsU0FBTyxNQUFNLHVDQUF1QyxLQUFLO0FBQ3pELFFBQU0sS0FBSyxXQUFXO0FBQ3hCO0FBRUEsU0FBUyxRQUFRLE9BQU87QUFDdEIsUUFBTSxLQUFLLFdBQVc7QUFDdEIsU0FBTyxPQUFPO0FBQ2QsV0FBUztBQUNYO0FBRUEsSUFBSTtBQUNKLE1BQU0sUUFBUSxVQUFRO0FBQ3BCLE9BQUssaUJBQWlCLFNBQVMsTUFBTTtBQUNuQyxRQUFJO0FBQWMsY0FBUSxZQUFZO0FBQ3RDLG1CQUFlLEVBQUUsTUFBTSxHQUFHLEtBQUssTUFBTSxLQUFLLFFBQVEsS0FBSyxFQUFFO0FBQ3pELFdBQU8sWUFBWTtBQUFBLEVBQ3JCLENBQUM7QUFDSCxDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
