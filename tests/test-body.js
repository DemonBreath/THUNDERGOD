#!/usr/bin/env node
const vm = require('vm');
const fs = require('fs');
const path = require('path');

global.window = global;
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../alexworld-co/assets/js/body.js'), 'utf8'));

const RIFT = {
  v: 1,
  name: 'Rift',
  tagline: 'Warm when close.',
  persona: 'You show up. You volunteer. You are in the room.',
  voice: { rate: 1, pitch: 1.05, gender: 'female' },
  knowledge: [
    { topic: 'purpose', content: 'Not to answer — to be in the room.' },
    { topic: 'alexworld', content: 'Offline minds get dreamed bodies here.' },
  ],
};

const dream = BodyDreamer.dreamPerfectBody(RIFT);
let failed = 0;
function ok(c, m) { if (!c) { console.error('FAIL', m); failed++; } else console.log('ok', m); }

ok(dream.perfect === true, 'perfect flag');
ok(dream.name === 'RIFT', 'uses mind name');
ok(dream.picks.brain && dream.picks.vision, 'has brain and vision');
ok(dream.manifesto.includes('Rift'), 'manifesto mentions mind');
ok(BodyDreamer.formatText(dream).includes('ALEXWORLD'), 'formatText header');

process.exit(failed ? 1 : 0);
