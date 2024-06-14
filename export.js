const fs = require('fs');
const yaml = require('js-yaml');
const slugify = require('slugify');

require('dotenv').config();

const YAML_FILE = './src/lib/alv_music.yml';

const sets = yaml.safeLoad(fs.readFileSync(YAML_FILE));

async function submitLink(trackInfo, kind) {
  const payload = {
    email: process.env.LINKLY_EMAIL,
    api_key: process.env.LINKLY_API_KEY,
    workspace_id: process.env.LINKLY_WORKSPACE,
    domain: process.env.LINKLY_DOMAIN,
    slug: `${kind}/${slugify(trackInfo.name, { lower: true })}`,
    name: `${trackInfo.name} (${kind.toUpperCase()})`,
    url: trackInfo[kind],
  };

  if (trackInfo[`${kind}_id`]) {
    payload.id = trackInfo[`${kind}_id`];
  }

  const resp = await fetch('https:app.linklyhq.com/api/v1/link', {
    body: JSON.stringify(payload),
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
  }).then(_ => _.json());

  trackInfo[`${kind}_id`] = resp.id;
  trackInfo[`${kind}_link`] = resp.full_url;
}

async function generateURLs() {
  for (const set of sets) {
    for (const track of set.tracks) {
      console.log('Processing link for', track.name);

      await submitLink(track, 'wav');
      await submitLink(track, 'mp3');
    }
  }

  fs.writeFileSync(YAML_FILE, yaml.safeDump(sets, { lineWidth: -1, noArrayIndent: true }));
}

generateURLs();
