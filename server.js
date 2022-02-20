import { serve } from 'https://deno.land/std@0.126.0/http/server.ts';
import { serveFile } from 'https://deno.land/std@0.126.0/http/file_server.ts';
import { parse as parseYaml } from 'https://deno.land/std@0.126.0/encoding/yaml.ts';
import { compile as etaCompile, config as etaConfig } from 'https://deno.land/x/eta@v1.12.3/mod.ts';

const indexHtmlContents = new TextDecoder().decode(await Deno.readFile('page/index.html'));
const indexTemplate = etaCompile(indexHtmlContents);

const handler = async (req) => {
  const urlMatch = /^(?:https?:\/\/)?[A-Za-z0-9:-]+(\/.*)?$/g.exec(req.url);
  const reqPath = (urlMatch[1] || '/');
  if (reqPath === '/') {
    return new Response('under construction');
  }
  if (reqPath.startsWith('/static/')) {
    const fileName = reqPath.substring('/static/'.length);
    return serveFile(req, 'page/' + fileName);
  }
  if (reqPath.startsWith('/reveal/')) {
    const fileName = reqPath.substring('/reveal/'.length);
    return serveFile(req, 'puzzles/reveal/' + fileName);
  }

  // Puzzle
  if (reqPath.match(/^\/[A-Za-z0-9]+$/g)) {
    const puzzleId = reqPath.substring(1);
    const puzzleContents = parseYaml(
      new TextDecoder().decode(await Deno.readFile(`puzzles/${puzzleId}.yml`))
    );
    puzzleContents.id = puzzleId;
    const pageContents = indexTemplate(puzzleContents, etaConfig);
    return new Response(pageContents, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  }
};

const port = 2220;
console.log(`http://localhost:${port}/`);
const server = serve(handler, { port });
