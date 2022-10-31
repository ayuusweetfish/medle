const log = (msg) => console.log(`*${(new Date()).toISOString()} ${msg}`)
const logRaw = (msg) => console.log(` ${msg}`)

const passphrase = Deno.env.get('PASS')

const serveReq = async (req) => {
  const path = (new URL(req.url)).pathname
  if (req.method === 'POST' && path === `/${passphrase}`) {
    const body = await req.text()
    logRaw(body)
    return new Response('')
  } else {
    return new Response('', { status: 400 })
  }
}

const port = +Deno.env.get('PORT') || 1031
const server = Deno.listen({ port })
log(`Running at http://localhost:${port}/`)
const handleConn = async (conn) => {
  const httpConn = Deno.serveHttp(conn)
  try {
    for await (const evt of httpConn) {
      const req = evt.request
      try {
        await evt.respondWith(await serveReq(req))
      } catch (e) {
        log(`Error: ${e}`)
        try {
          await evt.respondWith(new Response('', { status: 500 }))
        } catch (e) {
          log(`Cannot return 500 response: ${e}`)
        }
      }
    }
  } catch (e) {
    log(`Error: ${e}`)
  }
}
while (true) {
  const conn = await server.accept()
  handleConn(conn)
}
