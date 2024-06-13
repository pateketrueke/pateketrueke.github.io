const fs = require('fs');
const yaml = require('js-yaml');

require('dotenv').config();

// process.env.LINKLY_API_KEY;

const YAML_FILE = './src/lib/alv_music.yml';

const sets = yaml.safeLoad(fs.readFileSync(YAML_FILE));

async function generateURLs() {
  for (const set of sets) {
    for (const track of set.tracks) {
      if (!track.link_id) {
        console.log('CREATE LINK', track);
      } else {
        console.log('UPDATE LINK', track);
      }
    }
  }

  fs.writeFileSync(YAML_FILE, yaml.safeDump(sets, { lineWidth: -1, noArrayIndent: true }));
}

generateURLs();
