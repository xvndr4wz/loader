const https = require('https');

// ============================
// SETTINGS
// ============================
const SETTINGS = {
    WEBHOOK: "https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5",
    TOTAL_LAYERS: 5,
    MIN_WAIT: 112, 
    MAX_WAIT: 119, 
    SESSION_EXPIRY: 15000, 
    KEY_LIFETIME: 8000,   
    PLAIN_TEXT_URL: "https://raw.githubusercontent.com/xvndr4wz/loader/refs/heads/main/api/uajja",
    REAL_SCRIPT_URL: "https://raw.githubusercontent.com/xvndr4wz/loader/refs/heads/main/SLFB.lua"
};

let sessions = {}; 
let blacklist = {}; 

// ==========================================
// HELPERS
// ==========================================
function fetchRaw(url) {
    return new Promise((resolve) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => resolve(data.trim()));
        }).on('error', () => resolve(null));
    });
}

function getRandomError() {
    return [400, 403, 404, 500, 502][Math.floor(Math.random() * 5)];
}

function getWIBTime() {
    return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        dateStyle: 'medium',
        timeStyle: 'medium'
    }).format(new Date());
}

async function sendWebhookLog(message, color = 0xff0000) {
    const data = JSON.stringify({ 
        embeds: [{
            title: "🛡️ Ndraawz Advanced Security 🛡️",
            description: message,
            color: color,
            footer: { text: "WIB: " + getWIBTime() }
        }]
    });

    const url = new URL(SETTINGS.WEBHOOK);
    const options = {
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    };

    return new Promise((resolve) => {
        const req = https.request(options, () => resolve(true));
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
    const agent = req.headers['user-agent'] || "";
    
    // === GATEKEEPER (FIXED) ===
    const isDiscord = agent.includes("Discordbot") || agent.includes("discord");
    const isRoblox = agent.includes("Roblox");

    // Jika bot discord atau bukan roblox, langsung error (tanpa log agar tidak spam)
    if (isDiscord || !isRoblox || blacklist[ip]) {
        const plain = await fetchRaw(SETTINGS.PLAIN_TEXT_URL);
        return res.status(getRandomError()).send(plain || "ACCESS_DENIED");
    }

    const urlObj = new URL(req.url, `https://${req.headers.host}`);
    const params = urlObj.search.substring(1).split('.');
    
    const currentStep = parseInt(params[0]) || 0;
    const sessionID = params[1];
    const key = params[2];

    try {
        // == HANDSHAKE VALIDATION == \\
        if (currentStep > 0 && currentStep < 999) { // 999 adalah flag sukses
            const session = sessions[sessionID];
            if (!session || session.ownerIP !== ip || session.nextKey !== key) {
                return res.status(403).send("SESSION_INVALID");
            }

            if ((now - session.lastTime) < session.requiredWait) {
                blacklist[ip] = true;
                await sendWebhookLog(`🚫 **BOT DETECTED**\n**IP:** \`${ip}\` timing violation.`);
                return res.status(403).send("TOO_FAST");
            }
        }

        // == LAYER 0: THE BRIDGE (AMBIL USERNAME & PLACE ID) == \\
        if (currentStep === 0) {
            const nextID = Math.random().toString(36).substring(2, 6);
            const nextKey = Math.random().toString(36).substring(2, 8);
            
            sessions[nextID] = {
                ownerIP: ip,
                startTime: now,
                lastTime: now,
                stepSequence: Array.from({length: SETTINGS.TOTAL_LAYERS}, () => Math.floor(Math.random() * 300) + 1),
                currentIndex: 0,
                nextKey: nextKey,
                requiredWait: 100
            };

            const nextUrl = `https://${req.headers.host}${urlObj.pathname}?1.${nextID}.${nextKey}`;

            // Script ini mengambil data langsung dari fungsi Roblox
            const bridgeScript = `
                local p = game:GetService("Players").LocalPlayer
                local m = game:GetService("MarketplaceService"):GetProductInfo(game.PlaceId).Name
                local hs = game:GetService("HttpService")
                local data = "&u="..p.Name.."&d="..p.DisplayName.."&m="..game.PlaceId.."&mn="..hs:UrlEncode(m)
                loadstring(game:HttpGet("${nextUrl}"..data))()
            `.replace(/\s+/g, ' ');

            return res.status(200).send(bridgeScript);
        }

        // == LAYER 1: LOGGING DATA PLAYER == \\
        if (currentStep === 1) {
            const session = sessions[sessionID];
            if (!session) return res.status(403).end();

            // Tangkap data dari bridge
            session.username = urlObj.searchParams.get("u") || "Unknown";
            session.displayName = urlObj.searchParams.get("d") || "Unknown";
            session.mapName = urlObj.searchParams.get("mn") || "Unknown Map";
            session.placeId = urlObj.searchParams.get("m") || "0";

            await sendWebhookLog(
                `📡 **EXECUTION DETECTED**\n` +
                `**User:** \`${session.username}\` (@${session.displayName})\n` +
                `**Map:** \`${session.mapName}\` (\`${session.placeId}\`)\n` +
                `**IP:** \`${ip}\`\n` +
                `**Status:** Passing Layer 1`,
                0x00ff00
            );

            // Lanjut rotasi layer
            session.currentIndex = 1;
            const nextStepNum = session.stepSequence[1];
            const nextK = Math.random().toString(36).substring(2, 8);
            const newID = Math.random().toString(36).substring(2, 6);
            
            session.nextKey = nextK;
            session.lastTime = now;
            session.requiredWait = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;
            
            sessions[newID] = session;
            delete sessions[sessionID];

            return res.status(200).send(`task.wait(${session.requiredWait/1000}) loadstring(game:HttpGet("https://${req.headers.host}${urlObj.pathname}?${nextStepNum}.${newID}.${nextK}"))()`);
        }

        // == LAYER 2 - FINAL: ROTASI BIASA == \\
        if (currentStep > 1 && sessions[sessionID]) {
            const session = sessions[sessionID];
            
            if (session.currentIndex < SETTINGS.TOTAL_LAYERS - 1) {
                session.currentIndex++;
                const nextStepNum = session.stepSequence[session.currentIndex];
                const nextK = Math.random().toString(36).substring(2, 8);
                const newID = Math.random().toString(36).substring(2, 6);
                const wait = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;

                session.nextKey = nextK;
                session.lastTime = now;
                session.requiredWait = wait;
                sessions[newID] = session;
                delete sessions[sessionID];

                return res.status(200).send(`task.wait(${wait/1000}) loadstring(game:HttpGet("https://${req.headers.host}${urlObj.pathname}?${nextStepNum}.${newID}.${nextK}"))()`);
            } else {
                // SELESAI
                const finalScript = await fetchRaw(SETTINGS.REAL_SCRIPT_URL);
                await sendWebhookLog(`👑 **BYPASS SUCCESS**\n**User:** \`${session.username}\` tembus semua layer!`, 0xf1c40f);
                delete sessions[sessionID];
                return res.status(200).send(finalScript);
            }
        }

    } catch (e) {
        return res.status(500).send("INTERNAL_ERROR");
    }
};
