import { serve } from 'https://deno.land/std@0.126.0/http/server.ts';
import { serveFile } from 'https://deno.land/std@0.126.0/http/file_server.ts';
import { existsSync } from 'https://deno.land/std@0.126.0/fs/mod.ts';
import { parse as parseYaml } from 'https://deno.land/std@0.126.0/encoding/yaml.ts';
import { compile as etaCompile, config as etaConfig } from 'https://deno.land/x/eta@v1.12.3/mod.ts';

const log = (msg) => {
  console.log(`${(new Date()).toISOString()} ${msg}`);
};
const debug = (Deno.env.get('DEBUG') === '1');

const epoch = new Date('2022-02-20T16:00:00Z');
const todaysPuzzleIndex = () => Math.ceil((new Date() - epoch) / 86400000);
const todaysPuzzle = () => todaysPuzzleIndex().toString().padStart(3, '0');

const indexHtmlContents = new TextDecoder().decode(await Deno.readFile('page/index.html'));
const indexTemplate = etaCompile(indexHtmlContents);

const midiPitch = (s) => {
  const i = s.charCodeAt(0) - 'A'.charCodeAt(0);
  const oct = s.charCodeAt(s.length - 1) - '0'.charCodeAt(0);
  return 12 +
    [9, 11, 0, 2, 4, 5, 7][i] +
    oct * 12 +
    (s[1] === '#' ? 1 : s[1] === 'b' ? -1 : 0);
};

const noSuchPuzzle = () => new Response('No such puzzle > <\n', { status: 404 });

const servePuzzle = async (puzzleId, checkToday) => {
  const file = `puzzles/${puzzleId}.yml`;
  if (!existsSync(file)) return noSuchPuzzle();

  const puzzleContents = parseYaml(
    new TextDecoder().decode(await Deno.readFile(file))
  );

  puzzleContents.id = puzzleId;

  for (const note of puzzleContents.tune) {
    const noteName = note[0].toString();
    let noteValue = parseInt(noteName[0]);
    if (noteName.indexOf('-') !== -1) noteValue -= 7;
    if (noteName.indexOf('+') !== -1) noteValue += 7;
    if (noteName.indexOf('b') !== -1) noteValue -= 0.1;
    if (noteName.indexOf('#') !== -1) noteValue += 0.1;
    note[0] = noteValue;
  }
  puzzleContents.tunePitchBase = midiPitch(puzzleContents.tunePitchBase);

  puzzleContents.workDesc = etaConfig.e(puzzleContents.workDesc).replace(/\n/g, '<br>');

  const isDaily = !!puzzleId.match(/^[0-9]{3,}$/g);
  const today = todaysPuzzle();
  puzzleContents.guideToToday =
    (checkToday && isDaily && parseInt(puzzleId) < parseInt(today));
  puzzleContents.isDaily = isDaily;
  puzzleContents.todayDaily = today;

  log(`puzzle ${puzzleId}`);
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
      return servePuzzle(todaysPuzzle(), false);
    }
    if (url.pathname.startsWith('/static/')) {
      const fileName = url.pathname.substring('/static/'.length);
      return serveFile(req, 'page/' + fileName);
    }
    if (url.pathname.startsWith('/reveal/')) {
      const fileName = url.pathname.substring('/reveal/'.length);
      return serveFile(req, 'puzzles/reveal/' + fileName);
    }
    // Custom puzzle
    if (url.pathname.match(/^\/[A-Za-z0-9]+$/g)) {
      const puzzleId = url.pathname.substring(1);
      if (!debug && parseInt(puzzleId) > todaysPuzzleIndex())
        return noSuchPuzzle();
      return servePuzzle(puzzleId, url.search !== '?past');
    }
  } else if (req.method === 'POST') {
    // Analytics
    if (url.pathname === '/analytics') {
      try {
        const body = await req.formData();
        log(`analy ${body.get('puzzle')} ${body.get('t')}`);
      } catch (e) {
        return new Response('', { status: 400 });
      }
      return new Response('', { status: 200 });
    }
  }
  return new Response('Void space, please return\n', { status: 404 });
};

const port = 2220;
log(`http://localhost:${port}/`);
const server = serve(handler, { port });
