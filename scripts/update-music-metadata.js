#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const YAML_FILE = path.join(__dirname, '../src/lib/alv_music.yml');

function loadYaml() {
  const content = fs.readFileSync(YAML_FILE, 'utf8');
  return yaml.load(content);
}

function saveYaml(data) {
  const content = yaml.dump(data, {
    lineWidth: -1,
    noRefs: true,
    sortKeys: false
  });
  fs.writeFileSync(YAML_FILE, content);
}

function findTracksWithoutInfo(data) {
  const missing = [];
  
  for (const section of data) {
    if (!section.tracks) continue;
    
    for (const track of section.tracks) {
      if (!track.info || !track.info.match(/\d+\s*BPM/)) {
        missing.push({
          label: section.label,
          name: track.name,
          track: track.track,
          album: track.album,
          currentInfo: track.info || null,
          trackRef: track
        });
      }
    }
  }
  
  return missing;
}

function updateTrackInfo(data, trackName, label, info) {
  for (const section of data) {
    if (section.label !== label) continue;
    if (!section.tracks) continue;
    
    for (const track of section.tracks) {
      if (track.name === trackName) {
        track.info = info;
        return true;
      }
    }
  }
  return false;
}

async function main() {
  const args = process.argv.slice(2);
  const action = args[0];
  
  console.log('🎵 Bandcamp Music Metadata Updater\n');
  
  const data = loadYaml();
  
  if (action === 'add') {
    const trackName = args[1];
    const label = args[2];
    const info = args.slice(3).join(' ');
    
    if (!trackName || !label || !info) {
      console.log('Usage: node update-music-metadata.js add <track-name> <label> "<info>"');
      console.log('Example: node update-music-metadata.js add MIRROR LUMINARIES "110 BPM / Cm Dm"');
      process.exit(1);
    }
    
    const success = updateTrackInfo(data, trackName, label, info);
    if (success) {
      saveYaml(data);
      console.log(`✅ Updated ${trackName} (${label}) with: ${info}`);
    } else {
      console.log(`❌ Track not found: ${trackName} in ${label}`);
    }
    return;
  }
  
  if (action === 'list') {
    const missing = findTracksWithoutInfo(data);
    console.log(`Found ${missing.length} tracks missing BPM info:\n`);
    
    for (const track of missing) {
      console.log(`- [${track.label}] ${track.name}`);
      console.log(`  Track ID: ${track.track}`);
      if (track.album) console.log(`  Album ID: ${track.album}`);
      if (track.currentInfo) console.log(`  Current: ${track.currentInfo}`);
      console.log('');
    }
    return;
  }
  
  const missing = findTracksWithoutInfo(data);
  console.log(`Found ${missing.length} tracks missing BPM info:\n`);
  
  for (const track of missing) {
    console.log(`- [${track.label}] ${track.name}`);
    console.log(`  Track ID: ${track.track}`);
    if (track.album) console.log(`  Album ID: ${track.album}`);
    console.log('');
  }
  
  console.log('---');
  console.log('\n⚠️  Bandcamp does not expose BPM/chords in their public API.');
  console.log('These fields must be manually entered.\n');
  
  console.log('Commands:');
  console.log('  node update-music-metadata.js list                    # List missing tracks');
  console.log('  node update-music-metadata.js add <name> <label> "<info>"  # Add info to a track');
  console.log('');
  console.log('Format: "XXX BPM / Chord1 Chord2"');
  console.log('Example: "120 BPM / Cm Dm"');
  console.log('');
}

main().catch(console.error);
