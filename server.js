import { serve } from 'https://deno.land/std@0.126.0/http/server.ts';
import { serveFile } from 'https://deno.land/std@0.126.0/http/file_server.ts';

const handler = async (req) => {
  const urlMatch = /^(?:https?:\/\/)?[A-Za-z0-9:-]+(\/.*)?$/g.exec(req.url);
  const reqPath = (urlMatch[1] || '/');
  if (reqPath === '/') {
    return serveFile(req, 'page/index.html');
  }
  if (reqPath.startsWith('/static/')) {
    const fileName = reqPath.substring('/static/'.length);
    return serveFile(req, 'page/' + fileName);
  }
  if (reqPath.startsWith('/reveal/')) {
    const fileName = reqPath.substring('/reveal/'.length);
    return serveFile(req, 'puzzles/reveal/' + fileName);
  }
};

const port = 2220;
console.log(`http://localhost:${port}/`);
const server = serve(handler, { port });
