const https = require('https');

// ============================
// SETTINGS
// ============================
const SETTINGS = {
    WEBHOOK: "https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5",
    TOTAL_LAYERS: 5,
    MIN_WAIT: 112, 
    MAX_WAIT: 119, 
    SESSION_EXPIRY: 10000, 
    KEY_LIFETIME: 5000,   
    PLAIN_TEXT_URL: "https://raw.githubusercontent.com/xvndr4wz/loader/refs/heads/main/api/uajja",
    REAL_SCRIPT_URL: "https://raw.githubusercontent.com/xvndr4wz/loader/refs/heads/main/SLFB.lua"
};

// ==========================================
// MEMORY STORAGE
// ==========================================
let sessions = {}; 
let blacklist = {}; 

// HELPER: Fetch data dari Github
function fetchRaw(url) {
    return new Promise((resolve) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => resolve(data.trim()));
        }).on('error', () => resolve(null));
    });
}

// HELPER: Waktu WIB
function getWIBTime() {
    return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        dateStyle: 'medium',
        timeStyle: 'medium'
    }).format(new Date());
}

// HELPER: Kirim Log ke Discord
async function sendWebhookLog(message, color = 0x00ff00) {
    const data = JSON.stringify({ 
        embeds: [{
            title: "🛡️ Ndraawz Security System 🛡️",
            description: message,
            color: color,
            footer: { text: "Ndraawz Monitor | " + getWIBTime() }
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
// MAIN HANDLER
// ==========================================
module.exports = async function(req, res) {
    res.setHeader('Content-Type', 'text/plain');
    
    const now = Date.now();
    const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0] || "unknown";
    const agent = req.headers['user-agent'] || "Unknown";
    
    // Parsing URL params
    const fullUrl = new URL(req.url, `https://${req.headers.host}`);
    const queryParts = fullUrl.search.substring(1).split('.');
    
    const currentStep = parseInt(queryParts[0]) || 0;
    const sessionID = queryParts[1];
    const key = queryParts[2];

    // Cek Blacklist
    if (blacklist[ip] === true) {
        return res.status(403).send("BANNED");
    }

    try {
        // ==========================================
        // LAYER 0: INITIAL ACCESS (TESTER / BOT)
        // ==========================================
        if (currentStep === 0) {
            // KIRIM LOG SEKARANG (Biar saat di-tes pakai .get langsung muncul)
            await sendWebhookLog(
                `📡 **NEW ACCESS DETECTED**\n` +
                `**IP:** \`${ip}\`\n` +
                `**Agent:** \`${agent}\`\n` +
                `**Status:** Meminta Bridge (Menunggu eksekusi Roblox...)`,
                0xffff00 // Kuning (Status Pending)
            );

            // Buat Session Baru
            const newID = Math.random().toString(36).substring(2, 6);
            const newKey = Math.random().toString(36).substring(2, 8);
            
            sessions[newID] = {
                ownerIP: ip,
                startTime: now,
                lastTime: now,
                currentIndex: 0,
                nextKey: newKey,
                used: false
            };

            const bridgeUrl = `https://${req.headers.host}${fullUrl.pathname}?1.${newID}.${newKey}`;

            // Script Bridge untuk ambil data asli Roblox
            const bridgeScript = `
                local p = game:GetService("Players").LocalPlayer
                local m = game:GetService("MarketplaceService"):GetProductInfo(game.PlaceId).Name
                local query = "&u="..p.Name.."&d="..p.DisplayName.."&mn="..game:GetService("HttpService"):UrlEncode(m)
                loadstring(game:HttpGet("${bridgeUrl}"..query))()
            `.replace(/\s+/g, ' ');

            return res.status(200).send(bridgeScript);
        }

        // ==========================================
        // LAYER 1: ROBLOX DATA CAPTURE
        // ==========================================
        if (currentStep === 1) {
            const session = sessions[sessionID];
            if (!session || session.ownerIP !== ip) {
                return res.status(403).send("Invalid Session");
            }

            // Ambil data yang dikirim oleh Bridge Script
            const username = fullUrl.searchParams.get("u") || "Unknown";
            const display = fullUrl.searchParams.get("d") || "Unknown";
            const mapName = fullUrl.searchParams.get("mn") || "Unknown Map";

            // UPDATE LOG DENGAN DATA ROBLOX ASLI
            await sendWebhookLog(
                `👑 **ROBLOX EXECUTION STARTED**\n` +
                `**User:** \`${username}\` (@${display})\n` +
                `**Map:** \`${mapName}\`\n` +
                `**IP:** \`${ip}\`\n` +
                `**Executor:** \`${agent}\``,
                0x00ff00 // Hijau (Real Roblox)
            );

            // Ambil Script Utama dari Github
            const finalScript = await fetchRaw(SETTINGS.REAL_SCRIPT_URL);
            
            if (finalScript) {
                delete sessions[sessionID]; // Selesai, hapus session
                return res.status(200).send(finalScript);
            } else {
                return res.status(500).send("-- GITHUB ERROR --");
            }
        }

    } catch (err) {
        console.error(err);
        const plainResp = await fetchRaw(SETTINGS.PLAIN_TEXT_URL);
        return res.status(200).send(plainResp || "ERROR");
    }
};
