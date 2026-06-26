// File: api/index.js
// Deploy ke Vercel - WORK UNTUK SEMUA

export default async function handler(req, res) {
  const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5';
  
  try {
    // Ambil IP
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
      || req.socket.remoteAddress 
      || 'unknown';
    
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // Deteksi bot/AI
    const isBot = /bot|crawl|spider|scraper|ai|chatgpt|claude|facebookexternalhit|whatsapp|telegram/i.test(userAgent);
    
    // === KIRIM KE DISCORD (PASTI WORK) ===
    const discordMessage = {
      content: `**🔔 ADA AKSES!**\n\n` +
        `**🌐 IP:** \`${ip}\`\n` +
        `**📱 User-Agent:** \`${userAgent}\`\n` +
        `**🤖 Bot/AI:** ${isBot ? '✅ Yes' : '❌ No'}\n` +
        `**🕒 Waktu:** ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n` +
        `**📊 Status:** ${isBot ? 'AI/Bot mengakses' : 'Human mengakses'}`
    };

    // Kirim ke Discord (jangan pakai await biar gak ngeblock)
    fetch(DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discordMessage)
    }).catch(err => console.error('Discord error:', err));

    // === RESPONSE UNTUK SEMUA ===
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({
      status: "success",
      message: "SIRI NO TAHI WWKWKW",
      timestamp: new Date().toISOString(),
      ip: ip,
      is_bot: isBot,
      user_agent: userAgent,
      note: "Data sudah dikirim ke Discord"
    });

  } catch (error) {
    // === ERROR HANDLING ===
    console.error('Error:', error);
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({
      status: "error",
      message: "Terjadi error, tapi data tetap dikirim",
      error: error.message
    });
  }
                }
