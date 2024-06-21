const { Client } = require('@notionhq/client');

require('dotenv').config();

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

function get(field) {
  switch (field.type) {
    case 'number':
      return field.number;
    case 'status':
      return field.status;
    case 'title':
      return field.title[0].plain_text;
    case 'rich_text':
      return field.rich_text[0].plain_text;
    default:
      throw new Error(`Unknown '${field.type}' type`);
  }
}

async function getTracks() {
  const db = await notion.databases.query({
    database_id: process.env.NOTION_MUSIC_DB,
    filter: {
      property: 'Status',
      status: {
        equals: process.argv.includes('--todo')
          ? 'Sin empezar' : process.argv.includes('--wip')
            ? 'En curso' : 'Listo',
      },
    },
  });

  const tracks = [];

  db.results.forEach(_ => {
    const fixed_chords = get(_.properties.Chords);
    const fixed_values = fixed_chords.replace(/[^\w#]/g, ' ').split(/\s+/).filter(Boolean);
    const fixed_unique = fixed_values.reduce((all, _) => (all.includes(_) ? all : all.concat(_)), []);

    tracks.push({
      bpm: get(_.properties.Tempo),
      name: get(_.properties.Name),
      chords: fixed_chords,
      values: fixed_values,
      unique: fixed_unique,
    });
  });

  if (process.argv.includes('--info')) {
    tracks.forEach(_ => {
      console.log(_.name, _.bpm, _.chords);
    });
    console.log('---');
  }

  return tracks;
}

function usage(tracks, field) {
  const data = tracks.reduce((stats, _) => {
    [].concat(_[field]).forEach(value => {
      stats[value] = stats[value] || 0;
      stats[value]++;
    });
    return stats;
  }, {});

  const result = [];

  Object.keys(data).sort((a, b) => {
    return data[b] - data[a];
  }).forEach(key => {
    result.push({ key, count: data[key] });
  });

  console.log('Usage by', field);
  console.log(result.map(_ => `${_.key} (${_.count})`).join(', '));
  console.log('---');
}

async function main() {
  const tracks = await getTracks();

  usage(tracks, 'unique');
  usage(tracks, 'bpm');
}
main();
