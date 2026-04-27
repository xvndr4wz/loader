const https = require('https');

// ==========================================
// WEBHOOK RAHASIA (HANYA ADA DI SINI)
// ==========================================
const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5";

// ==========================================
// FUNGSI KIRIM KE DISCORD
// ==========================================
async function sendToDiscord(playerData) {
    const embed = {
        title: "🚀 Ndraawz Logger System",
        color: 0x00ff88,
        fields: playerData.fields || [],
        footer: { 
            text: "Ndraawz Security Logger",
            icon_url: "https://cdn.discordapp.com/attachments/1464912658108125278/1472698650848395451/icon.png"
        },
        timestamp: new Date().toISOString()
    };

    const payload = JSON.stringify({ embeds: [embed] });
    const url = new URL(DISCORD_WEBHOOK_URL);

    const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
        }
    };

    return new Promise((resolve) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 204 || res.statusCode === 200) {
                    console.log("✅ Log terkirim ke Discord");
                    resolve(true);
                } else {
                    console.log(`❌ Gagal kirim ke Discord: ${res.statusCode}`);
                    resolve(false);
                }
            });
        });
        req.on('error', (err) => {
            console.error("Error sending to Discord:", err);
            resolve(false);
        });
        req.write(payload);
        req.end();
    });
}

// ==========================================
// HANDLER UTAMA
// ==========================================
module.exports = async function handler(req, res) {
    // CORS header
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Hanya terima POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    let body = '';
    await new Promise((resolve) => {
        req.on('data', chunk => { body += chunk; });
        req.on('end', resolve);
    });

    try {
        const logData = JSON.parse(body);
        
        // Kirim ke Discord
        const success = await sendToDiscord(logData);
        
        if (success) {
            res.status(200).json({ status: 'ok', message: 'Log terkirim' });
        } else {
            res.status(500).json({ error: 'Failed to send to Discord' });
        }
    } catch (err) {
        console.error("Logger error:", err);
        res.status(400).json({ error: 'Invalid JSON' });
    }
};
