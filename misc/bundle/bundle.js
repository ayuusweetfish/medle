const imports = []
imports.push('page/index.html')
imports.push('build/list.txt')
;(await Deno.readTextFile('./build/list.txt'))
  .split('\n').forEach((f) => imports.push(`build/${f}`))
for await (const entry of Deno.readDir('./puzzles')) {
  if (entry.name.endsWith('.yml')) imports.push(`puzzles/${entry.name}`)
}
imports.sort()

const s = (await Deno.readTextFile('./server.js'))
  .replace('// ------ bundle ------ //', imports.map(
    (path) => `'${path}': (await import('./${path}', { with: { type: 'text' } })).default,\n`
  ).join(''))
await Deno.writeTextFile('./_bundle_temp.js', s)
const r = (await Deno.bundle({ entrypoints: ['./_bundle_temp.js'], minify: true }))
if (r.errors.length > 0 || r.warnings.length > 0)
  console.warn(r.errors, r.warnings)
else
  console.log(r.outputFiles[0].text())
await Deno.remove('./_bundle_temp.js')
