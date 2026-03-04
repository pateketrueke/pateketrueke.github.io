#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const YAML_FILE = path.join(__dirname, '../src/lib/alv_music.yml');
const MIDI_ON_SCOOPS_PATH = path.join(__dirname, '../../midi-on-scoops/dist/midi-on-scoops.cjs');
const MIDI_ON_SCOOPS_BUILDER = path.join(__dirname, '../../midi-on-scoops/bin/builder');

const { parse } = require(MIDI_ON_SCOOPS_PATH);
const builder = require(MIDI_ON_SCOOPS_BUILDER);

const NOTES = ['c', 'd', 'e', 'f', 'g', 'a', 'b'];
const MODIFIERS = ['', 'b', '#'];
const OCTAVES = ['2', '3', '4', '5'];

const CHORD_TYPES = {
  '': [0, 4, 7],
  'm': [0, 3, 7],
  '7': [0, 4, 7, 10],
  'm7': [0, 3, 7, 10],
  'maj7': [0, 4, 7, 11],
  'dim': [0, 3, 6],
  'dim7': [0, 3, 6, 9],
  'aug': [0, 4, 8],
  'sus2': [0, 2, 7],
  'sus4': [0, 5, 7],
  'add9': [0, 4, 7, 14],
  '6': [0, 4, 7, 9],
  '9': [0, 4, 7, 10, 14],
  '11': [0, 4, 7, 10, 14, 17],
};

function noteToMidi(note) {
  const match = note.match(/^([a-g])([#b])?(\d+)?$/i);
  if (!match) return 60;
  
  const [, noteName, modifier, octave] = match;
  const baseNote = NOTES.indexOf(noteName.toLowerCase());
  const mod = modifier === '#' ? 1 : modifier === 'b' ? -1 : 0;
  const oct = parseInt(octave || '4');
  
  return (oct + 1) * 12 + baseNote + mod;
}

function chordToMidi(chord, octave = '4') {
  const match = chord.match(/^([A-Ga-g])([#b])?(.*)$/);
  if (!match) return [60, 64, 67];
  
  let [, root, modifier, type] = match;
  root = root.toLowerCase();
  const mod = modifier === '#' ? 1 : modifier === 'b' ? -1 : 0;
  const intervals = CHORD_TYPES[type] || CHORD_TYPES[''];
  const rootMidi = noteToMidi(root + modifier + octave);
  
  return intervals.map(interval => rootMidi + interval);
}

function seededRandom(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash;
  }
  return function() {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff;
    return hash / 0x7fffffff;
  };
}

function parseYamlChords() {
  const content = fs.readFileSync(YAML_FILE, 'utf8');
  const data = yaml.load(content);
  const progressions = [];
  
  for (const section of data) {
    if (!section.tracks) continue;
    
    for (const track of section.tracks) {
      if (!track.info) continue;
      
      const bpmMatch = track.info.match(/(\d+)\s*BPM/i);
      const chordsMatch = track.info.match(/\/\s*([^\n\/]+)/);
      
      if (bpmMatch && chordsMatch) {
        const bpm = parseInt(bpmMatch[1]);
        let chordStr = chordsMatch[1].trim();
        
        // Remove HTML tags and special chars
        chordStr = chordStr.replace(/<[^>]+>/g, '').replace(/[^a-zA-Z#b\s]/g, '').trim();
        
        if (!chordStr || chordStr.length < 2) continue;
        
        const chords = chordStr.split(/\s+/).map(c => {
          const cleanChord = c.replace(/%/g, '').replace(/[^a-zA-Z#b]/g, '').trim();
          return cleanChord;
        }).filter(c => c.length > 0 && c.length <= 5);
        
        if (chords.length === 0) continue;
        
        progressions.push({
          name: track.name,
          label: section.label,
          bpm,
          chords,
          raw: chordStr
        });
      }
    }
  }
  
  return progressions;
}

function generateChordFromKey(rootNote, octave = '4') {
  const root = rootNote.toLowerCase().replace('b', 'b').replace('#', '#');
  const type = rootNote.includes('dim') ? 'dim' : 
               rootNote.includes('m') || rootNote.includes('m7') ? 'm' : '';
  
  return chordToMidi(root + type, octave);
}

const MUSIC_THEORY = {
  secondaryDominants: {
    'Cm': 'G7',
    'Dm': 'A7',
    'Em': 'F#7',
    'Fm': 'C7',
    'Gm': 'D7',
    'Am': 'E7',
    'Bm': 'F#7',
  },
  modalInterchange: {
    'Cm': ['C', 'Db', 'Eb'],
    'Em': ['E', 'F', 'G'],
    'Fm': ['F', 'Gb', 'Ab'],
    'Gm': ['G', 'Ab', 'Bb'],
    'Am': ['A', 'Bb', 'B'],
  },
  tritoneSubs: {
    'G7': 'Db7',
    'C7': 'F#7',
    'D7': 'Ab7',
    'A7': 'Eb7',
    'E7': 'Bb7',
  },
  commonProgressions: [
    { name: 'i - VII - VI - V', pattern: ['i', 'bVII', 'VI', 'V'] },
    { name: 'i - iv - v - i', pattern: ['i', 'iv', 'v', 'i'] },
    { name: 'i - VI - III - VII', pattern: ['i', 'VI', 'III', 'VII'] },
    { name: 'ii - V - I', pattern: ['ii', 'V', 'I'] },
    { name: 'I - vi - IV - V', pattern: ['I', 'vi', 'IV', 'V'] },
  ],
};

function getScaleChords(key) {
  const keyMap = {
    'C': ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim'],
    'Cm': ['Cm', 'Ddim', 'Eb', 'Fm', 'Gm', 'Ab', 'Bb'],
    'D': ['D', 'Em', 'F#m', 'G', 'A', 'Bm', 'C#dim'],
    'Dm': ['Dm', 'Edim', 'F', 'Gm', 'Am', 'Bb', 'C'],
    'E': ['E', 'F#m', 'G#m', 'A', 'B', 'C#m', 'D#dim'],
    'Em': ['Em', 'F#dim', 'G', 'Am', 'Bm', 'C', 'D'],
    'F': ['F', 'Gm', 'Am', 'Bb', 'C', 'Dm', 'Edim'],
    'Fm': ['Fm', 'Gdim', 'Ab', 'Bbm', 'Cm', 'Db', 'Eb'],
    'G': ['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#dim'],
    'Gm': ['Gm', 'Adim', 'Bb', 'Cm', 'Dm', 'Eb', 'F'],
    'A': ['A', 'Bm', 'C#m', 'D', 'E', 'F#m', 'G#dim'],
    'Am': ['Am', 'Bdim', 'C', 'Dm', 'Em', 'F', 'G'],
    'Bb': ['Bb', 'Cm', 'Dm', 'Eb', 'F', 'Gm', 'Adim'],
    'Bbm': ['Bbm', 'Cdim', 'Db', 'Ebm', 'Fm', 'Gb', 'Ab'],
  };
  return keyMap[key] || keyMap['Cm'];
}

function addVariation(baseChords, seed, variationType) {
  const random = seededRandom(seed + variationType);
  const result = [...baseChords];
  
  switch(variationType) {
    case 'add7':
      return result.map(c => c + '7');
    case 'sus':
      return result.map(c => c.includes('dim') ? c : c.replace(/m?$/, 'sus4'));
    case 'add9':
      return result.map(c => c.includes('dim') ? c : c + 'add9');
    case 'modal':
      const key = baseChords[0].replace(/[0-9]/g, '');
      const borrowed = MUSIC_THEORY.modalInterchange[key] || [];
      if (borrowed.length > 0) {
        const idx = Math.floor(random() * baseChords.length);
        result[idx] = borrowed[Math.floor(random() * borrowed.length)];
      }
      return result;
    case 'vibra':
      const key2 = baseChords[0].replace(/[0-9]/g, '');
      const secDom = MUSIC_THEORY.secondaryDominants[key2];
      if (secDom) {
        const idx = Math.floor(random() * (baseChords.length - 1)) + 1;
        result.splice(idx, 0, secDom);
      }
      return result;
    default:
      return result;
  }
}

function variationDescription(baseChords, variationType) {
  const descriptions = {
    'add7': 'Added 7th chords for richer harmony. 7ths add warmth and jazz feel.',
    'sus': 'Suspended chords (sus4) remove the 3rd, creating tension wanting to resolve.',
    'add9': 'Added 9th creates ambient texture without bass congestion.',
    'modal': 'Modal interchange - borrowed from parallel major/minor. Adds unexpected color.',
    'vibra': 'Secondary dominant adds extra tension before resolution. Classic jazz move.',
  };
  return descriptions[variationType] || '';
}

const DRUM_PATTERNS = {
  basic: {
    hat: 'x...x...x...x...',
    snare: '....x.......x...',
    kick: 'x...x...x...x...',
  },
  stepper: {
    hat: 'xxxxxxxxxxxxxxx[xx]',
    snare: '[xx]...[xx]...[xx]',
    kick: 'x...x...x...x...',
  },
  skank: {
    hat: 'x.x.x.x.x.x.x.x.',
    snare: '....x.......x...',
    kick: 'x...x...x...x...',
  },
  rubadub: {
    hat: 'x..x..x..x..x..x.',
    snare: '....x...x.....x.',
    kick: 'x..............x',
  },
};

function generateDubPattern(options) {
  const {
    seed = 'default',
    bpm = 120,
    chordProgression = null,
    variation = null,
    drums = 'skank',
    verbose = false,
  } = options;
  
  const random = seededRandom(seed);
  const progressions = parseYamlChords();
  
  let selectedProgression;
  if (chordProgression) {
    selectedProgression = progressions.find(p => 
      p.name.toLowerCase() === chordProgression.toLowerCase() ||
      p.raw.toLowerCase().includes(chordProgression.toLowerCase())
    ) || progressions[Math.floor(random() * progressions.length)];
  } else {
    selectedProgression = progressions[Math.floor(random() * progressions.length)];
  }
  
  let chords = [...selectedProgression.chords];
  
  // Clean up chords (remove numbers, fix formatting)
  chords = chords.map(c => {
    let cleaned = c.replace(/%/g, '').trim();
    // Handle chords like "B" -> "Bdim" or "D" -> "Dm" contextually
    if (cleaned.length === 1) {
      // Default to minor for single letters in dub context
      cleaned = cleaned.toLowerCase() + 'm';
    }
    return cleaned;
  }).filter(c => c.length > 0);
  
  if (variation && variation !== 'none') {
    chords = addVariation(chords, seed, variation);
  }
  
  // Limit to max 2 chords (midi-on-scoops works best with simpler patterns)
  if (chords.length > 2) {
    chords = chords.slice(0, 2);
  }
  
  const finalBpm = bpm || selectedProgression.bpm;
  
  const dubParts = [];
  
  const guitarChords = chords.map((c, i) => {
    const octave = '4';
    const midi = chordToMidi(c + (c.includes('m') ? 'm' : ''), octave);
    return midi.map(n => {
      const noteName = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'][n % 12];
      return noteName + octave;
    }).join('|');
  });
  
  const guitarNotes = guitarChords.map((c, i) => {
    return `${c} % ${c}`;
  }).join(' ');
  
  // Bass notes - convert chord root to bass note (octave 2)
  const bassNotes = chords.map(c => {
    const root = c.replace(/[0-9]/g, '').replace('dim', 'dim').replace('sus4', '').replace('sus2', '').replace('7', '').replace('m', '');
    const noteMap = { 'c': 'c2', 'd': 'd2', 'e': 'e2', 'f': 'f2', 'g': 'g2', 'a': 'a2', 'b': 'b2' };
    return noteMap[root.toLowerCase()] || root.toLowerCase() + '2';
  });
  
  let pattern = '-x-x *16';
  if (random() > 0.5) {
    pattern = '[-x-][-x-][-x-][-x-] *16';
  }
  
  // Generate actual chord notes (not % notation)
  const chordNotes = chords.map(c => {
    const midi = chordToMidi(c, '4');
    const noteNames = midi.map(n => {
      const names = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
      return names[n % 12] + '4';
    });
    return noteNames.join('|');
  }).join(' % ');
  
  let dubContent = `@tempo: ${finalBpm}

# guitar
@instrument: 1
notes: ${chordNotes}
pattern: ${pattern}

# bass
@instrument: 33
notes: ${bassNotes.join('|')}
pattern: xxxxxxxxxxxxxxxx

# drums
@channel: 9
notes: c2|d2|f#2
pattern: xxxxxxxxxxxxxxxx
`;
  
  const explanations = [
    `Generated from: "${selectedProgression.name}" (${selectedProgression.label})`,
    `Base BPM: ${finalBpm}`,
    `Chords: ${chords.join(' - ')}`,
  ];
  
  if (variation && variation !== 'none') {
    explanations.push(`Variation: ${variation} - ${variationDescription(chords, variation)}`);
  }
  
  explanations.push(`Rhythm: ${drums} style`);
  explanations.push(`Seed: ${seed}`);
  
  return {
    content: dubContent,
    info: {
      track: selectedProgression.name,
      label: selectedProgression.label,
      bpm: finalBpm,
      chords,
      variation: variation || 'none',
      drums,
      seed,
    },
    explanations,
  };
}

async function generateMidi(pattern, outputPath) {
  const ast = await parse(pattern.content);
  const code = builder(ast);
  const result = await code.save(outputPath, 'generated', true);
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const options = {
    seed: 'dub' + Date.now(),
    bpm: null,
    chordProgression: null,
    variation: null,
    drums: 'skank',
    verbose: false,
    output: 'tracks',
    play: false,
  };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--seed' && args[i + 1]) options.seed = args[++i];
    else if (args[i] === '--bpm' && args[i + 1]) options.bpm = parseInt(args[++i]);
    else if (args[i] === '--track' && args[i + 1]) options.chordProgression = args[++i];
    else if (args[i] === '--variation' && args[i + 1]) options.variation = args[++i];
    else if (args[i] === '--drums' && args[i + 1]) options.drums = args[++i];
    else if (args[i] === '--output' && args[i + 1]) options.output = args[++i];
    else if (args[i] === '--play') options.play = true;
    else if (args[i] === '--verbose') options.verbose = true;
    else if (args[i] === '--list') options.list = true;
    else if (args[i] === '--help') options.help = true;
  }
  
  if (options.help) {
    console.log(`
🎵 DUB Pattern Generator

Usage: npm run dub -- [options]

Options:
  --seed <name>         Seed for reproducible patterns (default: random)
  --bpm <number>       Override BPM
  --track <name>       Use specific track's chord progression
  --variation <type>   Add variation: add7, sus, add9, modal, vibra
  --drums <style>     Drum style: skank, stepper, rubadub, basic
  --output <dir>       Output directory for .dub files (default: tracks)
  --play               Play the generated file with timidity
  --list               List available chord progressions
  --verbose            Show detailed explanations
  --help               Show this help

Examples:
  npm run dub
  npm run dub -- --track BARDO
  npm run dub -- --track CONCRETE --variation modal
  npm run dub -- --variation vibra --drums stepper
  npm run dub -- --play
  npm run dub -- --list
`);
    return;
  }
  
  if (options.list) {
    const progressions = parseYamlChords();
    console.log('Available chord progressions:\n');
    for (const p of progressions) {
      console.log(`  ${p.name.padEnd(16)} | ${String(p.bpm).padEnd(3)} BPM | ${p.raw}`);
    }
    return;
  }
  
  console.log('🎵 DUB Pattern Generator\n');
  
  const pattern = generateDubPattern(options);
  
  console.log(pattern.explanations.join('\n'));
  console.log('\n---\n');
  
  // Save .dub file
  const fs = require('fs');
  const outputDir = path.join(__dirname, '..', options.output);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const safeName = pattern.info.track.toLowerCase().replace(/\s+/g, '_');
  const variationSuffix = pattern.info.variation !== 'none' ? '_' + pattern.info.variation : '';
  const dubFileName = `${safeName}${variationSuffix}_${pattern.info.seed}.dub`;
  const dubFilePath = path.join(outputDir, dubFileName);
  
  fs.writeFileSync(dubFilePath, pattern.content);
  console.log(`✅ .dub saved to: ${dubFilePath}`);
  
  // Generate MIDI and optionally play
  const midiResult = await generateMidi(pattern, dubFilePath.replace('.dub', ''));
  console.log(`✅ MIDI saved to: ${midiResult[0].filepath}`);
  
  if (options.play) {
    console.log('\n🎹 Playing with timidity...');
    const { spawn } = require('child_process');
    const timidity = spawn('timidity', [midiResult[0].filepath], { stdio: 'inherit' });
    timidity.on('close', (code) => {
      console.log(`\n⏹ Timidity exited with code ${code}`);
    });
  }
}

main().catch(console.error);
