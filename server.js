import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { serveFile } from 'https://deno.land/std@0.168.0/http/file_server.ts';
import { parse as parseYaml } from 'https://deno.land/std@0.168.0/encoding/yaml.ts';
import { compile as etaCompile, config as etaConfig } from 'https://deno.land/x/eta@v1.12.3/mod.ts';
import { minify as terserMinify } from 'https://esm.sh/terser@5.15.1';
import { minify as cssoMinify } from 'https://unpkg.com/csso@5.0.5/dist/csso.esm.js';

const log = (msg) => {
  console.log(`${(new Date()).toISOString()} ${msg}`);
};
const debug = (Deno.env.get('DEBUG') === '1');

// Built-in minification
// deno run --allow-read --allow-write --allow-env server.js build
if (Deno.args[0] === 'build') {
  try {
    await Deno.remove('build', { recursive: true });
  } catch (e) {
    if (!(e instanceof Deno.errors.NotFound)) throw e;
  }
  await Deno.mkdir('build');
  const hash = (s) => {
    let hash = 0;
    for (let i = 0; i < s.length; i++)
      hash = (hash * 31 + s.charCodeAt(i)) | 0;
    hash = (hash + 0x80000000) % 0x80000000;
    return hash.toString(16).padStart(8, '0');
  };
  // JS
  const jsContents = await Promise.all([
    'clipboard.min.js',
    'languages.js',
    'index.js',
  ].map(async (file) => await Deno.readTextFile('page/' + file)));
  const jsMinified = (await terserMinify(
    jsContents, { format: { comments: false } }
  )).code;
  const jsHash = hash(jsMinified);
  await Deno.writeTextFile(`build/index.min.${jsHash}.js`, jsMinified);
  // CSS
  const cssContents = await Deno.readTextFile('page/index.css');
  const cssMinified = cssoMinify(cssContents).css;
  const cssHash = hash(cssMinified);
  await Deno.writeTextFile(`build/index.min.${cssHash}.css`, cssMinified);
  Deno.exit();
}

const persistEndpoint = Deno.env.get('PERS');
const persistLog = (line) => {
  log(line);
  if (persistEndpoint)
    fetch(persistEndpoint, {
      method: 'POST',
      body: `${(new Date()).toISOString()} ${line}`,
    });
};

const epoch = new Date('2022-02-20T16:00:00Z');
const todaysPuzzleIndex = () => {
  const date = new Date();
  const id = Math.ceil((date - epoch) / 86400000);
  if (id <= 366) return id;
  if (date.getMonth() === 1 && date.getDate() === 29) return 366;
  date.setYear(2022);
  if (date < epoch) date.setYear(2023);
  return Math.ceil((date - epoch) / 86400000);
}
const todaysPuzzle = () => todaysPuzzleIndex().toString().padStart(3, '0');

let packaged = {}
if (Deno.env.get('NOBUILD') !== '1') {
  try {
    for await (const entry of Deno.readDir('build')) {
      if (entry.name.endsWith('.js')) packaged.indexJs = entry.name;
      if (entry.name.endsWith('.css')) packaged.indexCss = entry.name;
    }
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) { }
    throw err;
  }
}
if (packaged.indexJs === undefined || packaged.indexCss === undefined)
  packaged = false;

const indexHtmlContents = await Deno.readTextFile('page/index.html');
const indexTemplate = etaCompile(indexHtmlContents);

const availLangs = ['zh-Hans', 'en'];

const serveFileCached = async (req, path) => {
  const resp = await serveFile(req, path);
  resp.headers.set('Cache-Control', 'public, max-age=2592000');
  return resp;
};

const getCookies = (req) => {
  const cookies = req.headers.get('Cookie');
  if (cookies === null) return {};
  const dict = {};
  for (const s of cookies.split(';')) {
    const i = s.indexOf('=');
    const key = decodeURIComponent(s.substring(0, i).trim());
    const value = decodeURIComponent(s.substring(i + 1));
    dict[key] = value;
  }
  return dict;
};

const analytics = (req) => {
  const dict = getCookies(req);
  if (!dict['lang']) return '';
  return `${dict['lang']} ${dict['sfx']} ${dict['dark']} ${dict['highcon']} ${dict['notation']}`;
};

const NOTE_OFFS = [9, 11, 0, 2, 4, 5, 7];
const SCALE_OFFS = [0, 2, 4, 5, 7, 9, 11];

const midiPitch = (s) => {
  const i = s.charCodeAt(0) - 'A'.charCodeAt(0);
  const acci = (s[1] === '#' ? 1 : s[1] === 'b' ? -1 : 0);
  const oct = s.charCodeAt(acci === 0 ? 1 : 2) - '0'.charCodeAt(0);
  return 12 +
    NOTE_OFFS[i] +
    oct * 12 +
    acci;
};
const bend = (s) => {
  const i = s.indexOf('/');
  if (i === -1) return 1;
  return parseFloat(s.substring(i + 1)) / 440;
};

const negotiateLang = (accept, supported) => {
  const list = accept.split(',').map((s) => {
    s = s.trim();
    let q = 1;
    const pos = s.indexOf(';q=');
    if (pos !== -1) {
      const parsed = parseFloat(s.substring(pos + 3));
      if (isFinite(parsed)) q = parsed;
      s = s.substring(0, pos).trim();
    }
    return { lang: s, q };
  });

  let bestScore = 0;
  let bestLang = supported[0];
  for (const l of supported) {
    for (const { lang, q } of list) {
      if (lang.substring(0, 2) === l.substring(0, 2)) {
        const score = q + (lang === l ? 0.2 : 0);
        if (score > bestScore)
          [bestScore, bestLang] = [score, l];
      }
    }
  }
  return bestLang;
}

const noSuchPuzzle = () => new Response('No such puzzle > <\n', { status: 404 });

const servePuzzle = async (req, puzzleId, checkToday, isLanding) => {
  const today = todaysPuzzle();
  if (puzzleId === undefined) puzzleId = today;

  const file = `puzzles/${puzzleId}.yml`;

  let puzzleContents;
  try {
    puzzleContents = parseYaml(
      new TextDecoder().decode(await Deno.readFile(file))
    );
  } catch (err) {
    if (err instanceof Deno.errors.NotFound)
      return noSuchPuzzle();
    throw err;
  }

  puzzleContents.id = puzzleId;

  for (const note of puzzleContents.tune) {
    const noteName = note[0].toString();
    let noteValue = parseInt(noteName[0]);
    if (noteName.indexOf('-') !== -1) noteValue -= 7;
    if (noteName.indexOf('+') !== -1) noteValue += 7;
    if (noteName.indexOf('b') !== -1) noteValue -= 0.1;
    if (noteName.indexOf('#') !== -1) noteValue += 0.1;
    if (noteName.indexOf('*') !== -1) noteValue += 100;
    note[0] = noteValue;
  }

  // Accidentals in absolute notation
  const tunePitchBase = puzzleContents.tunePitchBase;
  const acciStyles = [];
  const note = tunePitchBase.charCodeAt(0) - 'A'.charCodeAt(0);
  const acci = (tunePitchBase[1] === 'b' ? -1 : 
                tunePitchBase[1] === '#' ? 1 : 0);
  for (let s = 1; s <= 7; s++) {
    acciStyles.push(`body.nota-alpha .fg > .bubble.solf-${s} > div.content:before { content: '${String.fromCharCode('A'.charCodeAt(0) + (note + s - 1) % 7)}'; }`);
  }
  for (let s = 1; s <= 7; s++) {
    const value = NOTE_OFFS[note] + acci + SCALE_OFFS[s - 1];
    const diff = (value - NOTE_OFFS[(note + s - 1) % 7] + 12) % 12;
    let accis = undefined;
    if (diff === 1) accis = ['\\266f', '\\266e', '\\2715'];
    else if (diff === 11) accis = ['\\266d', '\\266d\\266d', '\\266e'];
    if (accis) {
      acciStyles.push(`body.nota-alpha .bubble:not(.outline).solf-${s} > * > .accidental::before { content: '${accis[0]}'; }`);
      acciStyles.push(`body.nota-alpha .bubble:not(.outline).solf-${s} > .flat > .accidental::before { content: '${accis[1]}'; }`);
      acciStyles.push(`body.nota-alpha .bubble:not(.outline).solf-${s} > .sharp > .accidental::before { content: '${accis[2]}'; }`);
    }
  }
  puzzleContents.acciStyles = acciStyles.join('\n');

  puzzleContents.tuneNoteBase = puzzleContents.tunePitchBase[0];
  puzzleContents.tunePitchBend = bend(puzzleContents.tunePitchBase);
  puzzleContents.tunePitchBase = midiPitch(puzzleContents.tunePitchBase);

  const i18n = {};
  for (const lang of availLangs) {
    const langContents = puzzleContents[lang];
    i18n[lang] = langContents;
  }
  puzzleContents.i18nVars = i18n;

  puzzleContents.lang =
    negotiateLang(getCookies(req)['lang'] ||
      req.headers.get('Accept-Language') || '',
      availLangs);
  puzzleContents.availLangs = availLangs;
  puzzleContents.isLanding = isLanding;

  const isDaily = !!puzzleId.match(/^[0-9]{3,}$/g);
  puzzleContents.guideToToday = false;
  puzzleContents.isDaily = isDaily;
  puzzleContents.todayDaily = today;

  puzzleContents.packaged = packaged;

  persistLog(`puzzle ${puzzleId} ${req.url} ${analytics(req)}`);
  const pageContents = indexTemplate(puzzleContents, etaConfig);
  return new Response(pageContents, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
};

const handler = async (req) => {
  const url = new URL(req.url);
  if (req.method === 'GET') {
    if (url.pathname === '/') {
      return servePuzzle(req, undefined, false, true);
    }
    if (url.pathname === '/favicon.ico') {
      return serveFileCached(req, 'favicon.png');
    }
    if (url.pathname.startsWith('/build/')) {
      const fileName = url.pathname.substring('/build/'.length);
      return serveFileCached(req, 'build/' + fileName);
    }
    if (url.pathname.startsWith('/static/')) {
      const fileName = url.pathname.substring('/static/'.length);
      return serveFileCached(req, 'page/' + fileName);
    }
    if (url.pathname.startsWith('/reveal/')) {
      const fileName = url.pathname.substring('/reveal/'.length);
      return serveFileCached(req, 'puzzles/reveal/' + fileName);
    }
    // Custom puzzle
    if (url.pathname.match(/^\/[A-Za-z0-9]+$/g)) {
      const puzzleId = url.pathname.substring(1);
      if (!debug && parseInt(puzzleId) > todaysPuzzleIndex())
        return noSuchPuzzle();
      return servePuzzle(req, puzzleId, url.search !== '?past', false);
    }
  } else if (req.method === 'POST') {
    // Analytics
    if (url.pathname === '/analytics') {
      try {
        const body = await req.formData();
        persistLog(`analy ${body.get('puzzle')} ${body.get('t')} ${analytics(req)}`);
      } catch {
        return new Response('', { status: 400 });
      }
      return new Response('', { status: 200 });
    }
  }
  return new Response('Void space, please return\n', { status: 404 });
};

const port = 2220;
log(`http://localhost:${port}/`);
await serve(handler, { port });
