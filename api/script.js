const https = require('https');
const crypto = require('crypto');

// === SETTINGS === \\
const SETTINGS = {
    SECRET_SALT: "NDRAAWZGANTENG",
    WEBHOOK: "https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5",
    TOTAL_LAYERS: 5,
    MIN_WAIT: 112, // = SESUAI PERMINTAAN ANDA = \\
    MAX_WAIT: 119, // = SESUAI PERMINTAAN ANDA = \\
    SESSION_EXPIRY: 10000, // = 10 DETIK = \\
    PLAIN_TEXT_RESP: "keapa?",
    REAL_SCRIPT: `
        -- SCRIPT ASLI ANDA
        print("ZiFi Security: Script Verified and Loaded!")
        local p = game.Players.LocalPlayer
        if p.Character and p.Character:FindFirstChild("Humanoid") then
            p.Character.Humanoid.Health -= 50
        end
    `
};

// === MEMORY === \\
let sessions = {};
let blacklist = {}; 

// === FUNGSI WAKTU WIB (INDONESIA) === \\
function getWIBTime() {
    return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        dateStyle: 'medium',
        timeStyle: 'medium'
    }).format(new Date());
}

// === FUNGSI WEBHOOK EMBED === \\
async function sendWebhookLog(msg, hwid = "Not Detected") {
    const data = JSON.stringify({ 
        embeds: [{
            title: "❗️Ndraawz Security❗️",
            description: msg + `\n**HWID:** \`${hwid}\``,
            color: 0xff0000,
            footer: { text: "Ndraawz Security | WIB: " + getWIBTime() }
        }]
    });

    const url = new URL(SETTINGS.WEBHOOK);
    return new Promise((resolve) => {
        const req = https.request({
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, (res) => resolve(true));
        req.on('error', () => resolve(false));
        req.write(data);
        req.end();
    });
}

// === FUNGSI PLAIN TEXT / RAW === \\
function sendPlainResponse(res, customMsg = null) {
    const responseBody = customMsg || SETTINGS.PLAIN_TEXT_RESP;
    return res.status(200).send(responseBody);
}

// === FUNGSI LAYER (HANDSHAKE) === \\
function generateNextLayer(host, currentPath, step, id, nextKey, nextWait) {
    return `-- Layer ${step}\ntask.wait(${nextWait/1000})\nloadstring(game:HttpGet("https://${host}${currentPath}?step=${step}&id=${id}&key=${nextKey}"))()`;
}

// === MAIN HANDLER (EXPORT) === \\
module.exports = async (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    
    const now = Date.now();
    const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0] || "unknown";
    const agent = req.headers['user-agent'] || "";
    const hwid = req.headers['roblox-id'] || req.headers['x-roblox-hwid'] || "No HWID Detected"; // Mengambil HWID
    const { step, id, key } = req.query;
    const currentStep = parseInt(step) || 0;
    const host = req.headers.host;
    const currentPath = req.url.split('?')[0];

    // == VALIDASI USER AGENT (ROBLOX ONLY == \\
    const isRoblox = agent.includes("Roblox") || req.headers['roblox-id'];
    if (!isRoblox) return sendPlainResponse(res);

    // == CEK BLACKLIST == \\
    if (blacklist[ip]) return res.status(403).send("SECURITY : BANNED ACCESS!");

    try {
        // == SESI & TIMING == \\
        if (currentStep > 0) {
            const session = sessions[ip];
            
            if (!session) {
                return res.status(403).send("SECURITY : SESSION NOT FOUND.");
            }

            // CEK KADALUWARSA (10 DETIK)
            if (now - session.startTime > SETTINGS.SESSION_EXPIRY) {
                delete sessions[ip];
                return res.status(403).send("SECURITY : SESSION EXPIRED.");
            }
            
            if (session.id !== id || session.nextKey !== key) {
                delete sessions[ip];
                return res.status(200).send("SECURITY : HANDSHAKE ERROR.");
            }

            const timeDiff = now - session.lastTime;
            if (timeDiff < session.requiredWait) {
                blacklist[ip] = true;
                delete sessions[ip];
                await sendWebhookLog(`🚫 **DETECT BOT / SPEED BYPASS**\n**IP:** \`${ip}\` melompati layer terlalu cepat.`, hwid);
                return res.status(403).send("SECURITY : TIMING VIOLATION!");
            }
        }

        // == EKSEKUSI STEP == \\
        if (currentStep === 0) {
            const sessionID = Math.random().toString(36).substring(2, 12);
            const nextKey = Math.random().toString(36).substring(2, 8);
            const waitTime = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;

            sessions[ip] = { 
                id: sessionID, 
                nextKey: nextKey, 
                lastTime: now, 
                startTime: now, 
                requiredWait: waitTime 
            };

            const script = generateNextLayer(host, currentPath, 1, sessionID, nextKey, waitTime);
            return res.status(200).send(script);
        }

        if (currentStep < SETTINGS.TOTAL_LAYERS) {
            const nextKey = Math.random().toString(36).substring(2, 8);
            const waitTime = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;

            sessions[ip].nextKey = nextKey;
            sessions[ip].lastTime = now;
            sessions[ip].requiredWait = waitTime;

            const script = generateNextLayer(host, currentPath, currentStep + 1, id, nextKey, waitTime);
            return res.status(200).send(script);
        }

        // == FINAL == \\
        if (currentStep === SETTINGS.TOTAL_LAYERS) {
            await sendWebhookLog(`✅ **SUCCESS EXECUTE**\n**IP:** \`${ip}\` berhasil melewati ${SETTINGS.TOTAL_LAYERS} layer.`, hwid);
            delete sessions[ip];
            return res.status(200).send(SETTINGS.REAL_SCRIPT.trim());
        }

    } catch (err) {
        return res.status(500).send("SECURITY : INTERNAL ERROR!");
    }
};
