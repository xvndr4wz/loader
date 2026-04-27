// api/log.js
const https = require('https');

const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5";

module.exports = async function handler(req, res) {
    // CORS dan method
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Baca body request dari Roblox
    let body = '';
    await new Promise((resolve) => {
        req.on('data', chunk => body += chunk);
        req.on('end', resolve);
    });

    try {
        const data = JSON.parse(body);
        const embed = {
            title: "🚀 Ndraawz Logger",
            color: 0x00ff88,
            fields: data.fields || [],
            timestamp: new Date().toISOString()
        };

        // Kirim ke Discord Webhook
        const payload = JSON.stringify({ embeds: [embed] });
        const url = new URL(DISCORD_WEBHOOK);
        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        };

        const discordReq = https.request(options, (discordRes) => {
            discordRes.resume();
            res.status(200).json({ ok: true, discordStatus: discordRes.statusCode });
        });
        discordReq.on('error', (err) => {
            console.error(err);
            res.status(500).json({ error: err.message });
        });
        discordReq.write(payload);
        discordReq.end();

    } catch (err) {
        res.status(400).json({ error: 'Invalid JSON' });
    }
};
