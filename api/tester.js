const https = require('https');

// ============================
// SETTINGS
// ============================
const SETTINGS = {
    WEBHOOK: "https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5",
    // Script asli yang akan diberikan di akhir
    REAL_SCRIPT_URL: "https://raw.githubusercontent.com/xvndr4wz/loader/refs/heads/main/SLFB.lua",
    // Script cadangan jika terjadi error
    ERROR_SCRIPT: 'print("Ndraawz Security: Internal Error or Bot Detected")'
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getWIBTime() {
    return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        dateStyle: 'medium',
        timeStyle: 'medium'
    }).format(new Date());
}

async function sendWebhookLog(message, color = 0x00ff00) {
    const data = JSON.stringify({ 
        embeds: [{
            title: "🛡️ Ndraawz Security System 🛡️",
            description: message,
            color: color,
            footer: { text: "Monitor Active | " + getWIBTime() }
        }]
    });

    const url = new URL(SETTINGS.WEBHOOK);
    const options = {
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    };

    return new Promise((resolve) => {
        const req = https.request(options, (res) => {
            res.on('end', () => resolve(true));
        });
        req.on('error', () => resolve(false));
        req.write(data);
        req.end();
    });
}

function fetchGithub(url) {
    return new Promise((resolve) => {
        https.get(url, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve(body));
        }).on('error', () => resolve(null));
    });
}

// ==========================================
// MAIN SERVER HANDLER
// ==========================================

module.exports = async function(req, res) {
    res.setHeader('Content-Type', 'text/plain');
    
    const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0] || "unknown";
    const agent = req.headers['user-agent'] || "Unknown";
    const placeId = req.headers['x-roblox-place-id'] || "N/A";
    
    const fullUrl = new URL(req.url, `https://${req.headers.host}`);
    const step = fullUrl.searchParams.get("step") || "0";

    try {
        // ---------------------------------------------------------
        // PHASE 0: INITIAL/TESTER LOG (Ini yang muncul saat di .get)
        // ---------------------------------------------------------
        if (step === "0") {
            const isDiscord = agent.includes("Discord");

            await sendWebhookLog(
                `📡 **NEW ACCESS DETECTED**\n` +
                `**IP:** \`${ip}\`\n` +
                `**Agent:** \`${agent}\`\n` +
                `**Place ID:** \`${placeId}\`\n` +
                `**Status:** ${isDiscord ? "Testing via Discord Bot" : "Sending Bridge to Roblox User"}`,
                isDiscord ? 0xffff00 : 0x3498db
            );

            // Kita kirim Bridge Script. 
            // Script ini akan berjalan otomatis di Roblox untuk ambil data Akun.
            const bridgeScript = `
                local p = game:GetService("Players").LocalPlayer
                local m = "Unknown"
                pcall(function() m = game:GetService("MarketplaceService"):GetProductInfo(game.PlaceId).Name end)
                local url = "https://${req.headers.host}${fullUrl.pathname}?step=1&u="..p.Name.."&d="..p.DisplayName.."&mn="..game:GetService("HttpService"):UrlEncode(m).."&pid="..game.PlaceId
                loadstring(game:HttpGet(url))()
            `.replace(/\s+/g, ' ');

            return res.status(200).send(bridgeScript);
        }

        // ---------------------------------------------------------
        // PHASE 1: REAL ROBLOX DATA (Muncul setelah Bridge jalan)
        // ---------------------------------------------------------
        if (step === "1") {
            const user = fullUrl.searchParams.get("u") || "Unknown";
            const disp = fullUrl.searchParams.get("d") || "Unknown";
            const mapName = fullUrl.searchParams.get("mn") || "Unknown Map";
            const pid = fullUrl.searchParams.get("pid") || "N/A";

            // LOG KEDUA: Data Lengkap User
            await sendWebhookLog(
                `👑 **ROBLOX BYPASS SUCCESS**\n` +
                `**User:** \`${user}\` (@${disp})\n` +
                `**Map:** \`${mapName}\` (\`${pid}\`)\n` +
                `**IP:** \`${ip}\`\n` +
                `**Executor:** \`${agent}\``,
                0x00ff00
            );

            // Berikan script asli dari Github
            const mainScript = await fetchGithub(SETTINGS.REAL_SCRIPT_URL);
            return res.status(200).send(mainScript || "-- Failed to fetch script from Github");
        }

    } catch (err) {
        console.error(err);
        return res.status(500).send(SETTINGS.ERROR_SCRIPT);
    }
};
