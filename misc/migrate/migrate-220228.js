import { BufReader } from 'https://deno.land/std/io/bufio.ts';
import { TextProtoReader } from 'https://deno.land/std/textproto/mod.ts';

const input = new TextProtoReader(new BufReader(Deno.stdin));

const work = [];

while (true) {
  const line = await input.readLine();
  if (line === null) break;

  if (line.startsWith('work')) {
    const i = line.indexOf(': ');
    work.push([line.substring(0, i), line.substring(i + 2)]);
  } else {
    if (work.length > 0) {
      for (const lang of ['zh-Hans', 'en']) {
        console.log(`${lang}:`);
        for (let [k, v] of work) {
          if (k === 'workTitle') k = 'title';
          if (k === 'workAuthor') k = 'author';
          if (k === 'workDesc') k = 'desc';
          console.log(`  ${k}: ${v}`);
        }
      }
      console.log();
      work.splice(0);
    }
    console.log(line);
  }
}

// for i in *.yml; do deno run % < $i > x; mv x $i; done
