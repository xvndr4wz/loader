const https = require('https');

// ============================
// SETTINGS
// ============================
const SETTINGS = {
    WEBHOOK: "https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5",
    // Link script asli kamu di Github
    REAL_SCRIPT_URL: "https://raw.githubusercontent.com/xvndr4wz/loader/refs/heads/main/SLFB.lua",
    // Versi proteksi
    VERSION: "v3.0 (Advanced Auto-Detection)"
};

// ==========================================
// HELPER: WIB TIME
// ==========================================
function getWIBTime() {
    return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        dateStyle: 'medium',
        timeStyle: 'medium'
    }).format(new Date());
}

// ==========================================
// HELPER: SEND WEBHOOK
// ==========================================
async function sendWebhookLog(message, color = 0x00ff00) {
    const data = JSON.stringify({ 
        embeds: [{
            title: "🛡️ Ndraawz Security System 🛡️",
            description: message,
            color: color,
            footer: { text: `Monitor Active | ${SETTINGS.VERSION} | ${getWIBTime()}` }
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

// ==========================================
// HELPER: FETCH GITHUB
// ==========================================
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
    
    // Deteksi IP dan Agent
    const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0] || "unknown";
    const agent = req.headers['user-agent'] || "Unknown Agent";
    const placeIdHeader = req.headers['x-roblox-place-id'] || "N/A";
    
    // Parsing URL params
    const fullUrl = new URL(req.url, `https://${req.headers.host}`);
    const step = fullUrl.searchParams.get("step") || "0";

    try {
        // ---------------------------------------------------------
        // TAHAP 0: INITIAL ACCESS (Saat kamu tes di Bot Discord / Klik pertama)
        // ---------------------------------------------------------
        if (step === "0") {
            const isDiscord = agent.includes("Discord");

            // LOG 1: Langsung kirim ke Discord begitu link di-GET
            await sendWebhookLog(
                `📡 **NEW ACCESS DETECTED**\n` +
                `**IP:** \`${ip}\`\n` +
                `**Agent:** \`${agent}\`\n` +
                `**Place ID (Header):** \`${placeIdHeader}\`\n` +
                `**Status:** ${isDiscord ? "Testing via Bot/Browser" : "Sending Bridge to Executor"}`,
                isDiscord ? 0xffff00 : 0x3498db
            );

            // Jika itu Roblox, kita kasih perintah Lua untuk ambil data player
            // Jika itu Bot Discord, dia cuma bakal baca teks ini (log sudah terkirim)
            const bridgeScript = `
                local p = game:GetService("Players").LocalPlayer
                local m = "Unknown"
                pcall(function() m = game:GetService("MarketplaceService"):GetProductInfo(game.PlaceId).Name end)
                local hs = game:GetService("HttpService")
                local url = "https://${req.headers.host}${fullUrl.pathname}?step=1&u="..p.Name.."&d="..p.DisplayName.."&mn="..hs:UrlEncode(m).."&pid="..game.PlaceId
                loadstring(game:HttpGet(url))()
            `.replace(/\s+/g, ' ');

            return res.status(200).send(bridgeScript);
        }

        // ---------------------------------------------------------
        // TAHAP 1: DATA CAPTURED (Saat dijalankan di Roblox Asli)
        // ---------------------------------------------------------
        if (step === "1") {
            const user = fullUrl.searchParams.get("u") || "Unknown";
            const disp = fullUrl.searchParams.get("d") || "Unknown";
            const mapName = fullUrl.searchParams.get("mn") || "Unknown Map";
            const pid = fullUrl.searchParams.get("pid") || "N/A";

            // LOG 2: Data lengkap user dari fungsi Roblox
            await sendWebhookLog(
                `👑 **ROBLOX EXECUTION SUCCESS**\n` +
                `**User:** \`${user}\` (@${disp})\n` +
                `**Map:** \`${mapName}\` (\`${pid}\`)\n` +
                `**IP:** \`${ip}\`\n` +
                `**Executor:** \`${agent}\``,
                0x00ff00 // Warna Hijau Sukses
            );

            // Berikan script asli kamu dari Github
            const mainScript = await fetchGithub(SETTINGS.REAL_SCRIPT_URL);
            
            if (mainScript) {
                return res.status(200).send(mainScript);
            } else {
                return res.status(500).send("-- ERROR: Could not fetch script from Github --");
            }
        }

    } catch (err) {
        // Jika ada error, kirim log error agar kamu tahu
        await sendWebhookLog(`⚠️ **SERVER ERROR**\n\`\`\`${err.message}\`\`\``, 0xff0000);
        return res.status(500).send("-- INTERNAL SERVER ERROR --");
    }
};
