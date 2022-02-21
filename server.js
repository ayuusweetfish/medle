import { serve } from 'https://deno.land/std@0.126.0/http/server.ts';
import { serveFile } from 'https://deno.land/std@0.126.0/http/file_server.ts';
import { parse as parseYaml } from 'https://deno.land/std@0.126.0/encoding/yaml.ts';
import { compile as etaCompile, config as etaConfig } from 'https://deno.land/x/eta@v1.12.3/mod.ts';

const epoch = new Date('2022-02-20T16:00:00Z');

const indexHtmlContents = new TextDecoder().decode(await Deno.readFile('page/index.html'));
const indexTemplate = etaCompile(indexHtmlContents);

const servePuzzle = async (puzzleId) => {
  const puzzleContents = parseYaml(
    new TextDecoder().decode(await Deno.readFile(`puzzles/${puzzleId}.yml`))
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
  const pageContents = indexTemplate(puzzleContents, etaConfig);
  return new Response(pageContents, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
};

const handler = async (req) => {
  const urlMatch = /^(?:https?:\/\/)?[A-Za-z0-9.:-]+(\/.*)?$/g.exec(req.url);
  const reqPath = (urlMatch[1] || '/');
  if (reqPath === '/') {
    const index = Math.ceil((new Date() - epoch) / 86400000);
    return servePuzzle(index.toString().padStart(3, '0'));
  }
  if (reqPath.startsWith('/static/')) {
    const fileName = reqPath.substring('/static/'.length);
    return serveFile(req, 'page/' + fileName);
  }
  if (reqPath.startsWith('/reveal/')) {
    const fileName = reqPath.substring('/reveal/'.length);
    return serveFile(req, 'puzzles/reveal/' + fileName);
  }
  // Custom puzzle
  if (reqPath.match(/^\/[A-Za-z0-9]+$/g)) {
    const puzzleId = reqPath.substring(1);
    return servePuzzle(puzzleId);
  }
};

const port = 2220;
console.log(`http://localhost:${port}/`);
const server = serve(handler, { port });
