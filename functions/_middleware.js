export async function onRequest(context) {
  const url = new URL(context.request.url)
  const userAgent = context.request.headers.get("user-agent") || ""

  // Blokir .lua kalau dibuka dari browser (Mozilla, Chrome, Safari, dst)
  if (url.pathname.endsWith(".lua") && userAgent.includes("Mozilla")) {
    return new Response("404 Not Found", { status: 404 })
  }

  // Kalau bukan browser (misal dari HttpGet Roblox), tetap diloloskan
  return context.next()
}
