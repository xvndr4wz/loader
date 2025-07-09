export async function onRequest(context) {
  const url = new URL(context.request.url)
  if (url.pathname.endsWith('.lua')) {
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head><title>404 Ga Ketemu</title></head>
      <body style="background:black;color:lime;text-align:center;padding-top:100px;font-family:monospace">
        <h1>404 - Scriptnya Ga Ada, Bocil!</h1>
        <p>Mau nyolong ya? 😏<br>Gak semudah itu, Ferguso.</p>
      </body>
      </html>
    `, {
      status: 404,
      headers: { 'content-type': 'text/html' }
    })
  }

  return context.next()
}
