export async function onRequest(context) {
  const url = new URL(context.request.url)
  if (url.pathname.endsWith('.lua')) {
    return new Response('404Not Found', { status: 404 })
  }

  return context.next()
}
