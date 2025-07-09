export async function onRequest(context) {
  const url = new URL(context.request.url);
  const ua = context.request.headers.get("user-agent") || "";

  // Kalau user buka dari browser dan akses file di /data/
  if (ua.includes("Mozilla") && url.pathname.startsWith("/data/")) {
    return new Response(`
      <!DOCTYPE html>
      <html><head><title>404 Not Found</title></head>
      <body style="text-align:center;font-family:sans-serif;padding-top:10%;">
        <h1>🗿 404 - Salah Jalan, Bang</h1>
        <p>Niat banget buka script gua pake browser 😹<br>Gak segampang itu, sobat bocil!</p>
        <p style="font-size:13px;color:#999;">Ndraaw Loader™ – Anti liat script sejak 2024</p>
      </body></html>
    `, {
      status: 404,
      headers: {
        "Content-Type": "text/html"
      }
    });
  }

  // Selain itu (misal dari Roblox HttpGet), tetap diloloskan
  return context.next();
}
