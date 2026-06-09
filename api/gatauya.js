// File: api/apapun.js (bebas nama filenya)
// Bisa juga: api/notif.js, api/tes.js, api/ip.js, dll.

export default async function handler(req, res) {
    // Ganti dengan URL Discord Webhook kamu
    const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5';
    
    // Ambil IP (support Vercel/Cloudflare/proxy)
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
        || req.socket.remoteAddress 
        || req.connection.remoteAddress
        || 'unknown';
    
    const userAgent = req.headers['user-agent'] || 'unknown';
    const method = req.method;
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    
    // Kirim ke Discord (fire and forget)
    const discordMessage = {
        content: `**🔔 LINK DI AKSES!**\n\n` +
                 `**🌐 IP:** \`${ip}\`\n` +
                 `**⏰ Waktu:** ${timestamp}\n` +
                 `**📱 User-Agent:** ${userAgent.substring(0, 150)}\n` +
                 `**🔧 Method:** ${method}`
    };
    
    fetch(DISCORD_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discordMessage)
    }).catch(err => console.error('Discord error:', err.message));
    
    // Response JSON bebas
    res.status(200).json({
        status: 'ok',
        ip: ip,
        time: timestamp,
        message: 'Notifikasi terkirim ke Discord'
    });
}
