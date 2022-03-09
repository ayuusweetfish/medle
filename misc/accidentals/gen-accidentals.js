const names = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const offs = [0, 2, 4, 5, 7, 9, 11];
const acci = {};
acci[-1] = 'b';
acci[0] = '';
acci[1] = 'h';

const valid = [
  'C',
  'G', 'D', 'A', 'E', 'B', 'Fh',
  'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'
];

console.log(`/* +++ Alphabetic notation note names +++ */`);
for (let n = 0; n < 7; n++)
  for (let a = -1; a <= 1; a++) {
    if (valid.indexOf(names[n] + acci[a]) === -1) continue;
    for (let s = 1; s <= 7; s++) {
      console.log(
        `body.scale-${names[n]}${acci[a]}.nota-alpha .fg > .bubble.solf-${s} > div.content:before { content: '${names[(n + s - 1) % 7]}'; }`
      );
    }
  }
console.log(`/* --- Alphabetic notation note names --- */`);

console.log();

console.log(`/* +++ Alphabetic notation accidentals +++ */`);
for (let n = 0; n < 7; n++)
  for (let a = -1; a <= 1; a++) {
    if (valid.indexOf(names[n] + acci[a]) === -1) continue;
    for (let s = 1; s <= 7; s++) {
      const value = offs[n] + a + offs[s - 1];
      const diff = (value - offs[(n + s - 1) % 7] + 12) % 12;
      if (diff === 1) {
        // Sharp note
        console.log(`
body.nota-alpha.scale-${names[n]}${acci[a]} .bubble:not(.outline).solf-${s} > * > .accidental::before { content: '\\266f'; }
body.nota-alpha.scale-${names[n]}${acci[a]} .bubble:not(.outline).solf-${s} > .flat > .accidental::before { content: '\\266e'; }
body.nota-alpha.scale-${names[n]}${acci[a]} .bubble:not(.outline).solf-${s} > .sharp > .accidental::before { content: '\\266f\\266f'; }
`.trim());
      } else if (diff === 11) {
        // Flat note
        console.log(`
body.nota-alpha.scale-${names[n]}${acci[a]} .bubble:not(.outline).solf-${s} > * > .accidental::before { content: '\\266d'; }
body.nota-alpha.scale-${names[n]}${acci[a]} .bubble:not(.outline).solf-${s} > .flat > .accidental::before { content: '\\266d\\266d'; }
body.nota-alpha.scale-${names[n]}${acci[a]} .bubble:not(.outline).solf-${s} > .sharp > .accidental::before { content: '\\266e'; }
`.trim());
      }
    }
  }
console.log(`/* --- Alphabetic notation accidentals --- */`);
