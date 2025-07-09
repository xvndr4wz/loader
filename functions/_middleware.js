export async function onRequest(context) {
  const url = new URL(context.request.url);
  const ua = context.request.headers.get("user-agent") || "";

  // Kalau dibuka dari browser (user-agent ada 'Mozilla') → redirect ke GitHub
  if (ua.includes("Mozilla")) {
    return Response.redirect("https://raw.githubusercontent.com/GhostPlayer352/Test4/refs/heads/main/Script%20Not%20Found", 302);
  }

  // Kalau dari Roblox atau lainnya → lanjut akses normal
  return context.next();
}
