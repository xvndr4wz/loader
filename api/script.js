const https = require('https');
const crypto = require('crypto');

// === SETTINGS === \\
const SETTINGS = {
    SECRET_SALT: "NDRAAWZGANTENG",
    WEBHOOK: "https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5",
    TOTAL_LAYERS: 5,
    MIN_WAIT: 112, // = JEDA MINIMAL (MS) = \\
    MAX_WAIT: 119, // = JEDA MAXIMAL (MS) = \\
    SESSION_EXPIRY: 10000, // == SESI EXPIRED DALAM 10 DETIK (MS) == \\
    LINK_LIFETIME: 5000, // == TIME-KEY: LINK MATI DALAM 5 DETIK (MS) == \\
    PLAIN_TEXT_RESP: "kenapa?",
    REAL_SCRIPT: `
        -- SCRIPT ASLI ANDA
        print("ZiFi Security: All Protections Active!")
        local p = game.Players.LocalPlayer
        if p.Character and p.Character:FindFirstChild("Humanoid") then
            p.Character.Humanoid.Health -= 50
        end
    `
};

// === MEMORY === \\
let sessions = {};
let usedLinks = {}; // == UNTUK SISTEM GHOST LINK == \\
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
async function sendWebhookLog(msg) {
    const data = JSON.stringify({ 
        embeds: [{
            title: "❗️Ndraawz Security❗️",
            description: msg,
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
    const timestamp = Date.now(); // == TIME-KEY GENERATOR == \\
    return `-- Layer ${step}\ntask.wait(${nextWait/1000})\nloadstring(game:HttpGet("https://${host}${currentPath}?step=${step}&id=${id}&key=${nextKey}&t=${timestamp}"))()`;
}

// === MAIN HANDLER (EXPORT) === \\
module.exports = async (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    
    const now = Date.now();
    const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0] || "unknown";
    const agent = req.headers['user-agent'] || "";
    const { step, id, key, t } = req.query; // == T ADALAH TIME-KEY == \\
    const currentStep = parseInt(step) || 0;
    const host = req.headers.host;
    const currentPath = req.url.split('?')[0];

    // == VALIDASI USER AGENT (ROBLOX ONLY) == \\
    const isRoblox = agent.includes("Roblox") || req.headers['roblox-id'];
    if (!isRoblox) return sendPlainResponse(res);

    // == CEK BLACKLIST == \\
    if (blacklist[ip]) return res.status(403).send("SECURITY : BANNED ACCESS!");

    try {
        // == SESI & TIMING == \\
        if (currentStep > 0) {
            const session = sessions[ip];

            // == VERIFIKASI GHOST LINK (ANTI RE-FETCH) == \\
            const linkID = `${id}_${step}_${key}_${t}`;
            if (usedLinks[linkID]) {
                await sendWebhookLog(`🚨 **GHOST LINK**\n**IP:** \`${ip}\` mencoba fetch ulang.`);
                return res.status(403).send("SECURITY : LINK ALREADY USED.");
            }
            
            // == VERIFIKASI TIME-KEY (LINK EXPIRED DALAM 5 DETIK) == \\
            if (!t || (now - parseInt(t)) > SETTINGS.LINK_LIFETIME) {
                return res.status(403).send("SECURITY : LINK EXPIRED.");
            }
            
            // == VERIFIKASI SESI == \\
            if (!session) return res.status(403).send("SECURITY : SESSION NOT FOUND.");

            // == VERIFIKASI KADALUWARSA SESI (10 DETIK) == \\
            if (now - session.startTime > SETTINGS.SESSION_EXPIRY) {
                delete sessions[ip];
                return res.status(403).send("SECURITY : SESSION EXPIRED.");
            }
            
            // == VERIFIKASI KEY == \\
            if (session.id !== id || session.nextKey !== key) {
                delete sessions[ip];
                return res.status(200).send("SECURITY : HANDSHAKE ERROR.");
            }

            // == VERIFIKASI KECEPATAN (ANTI BOT) == \\
            const timeDiff = now - session.lastTime;
            if (timeDiff < session.requiredWait) {
                blacklist[ip] = true;
                delete sessions[ip];
                await sendWebhookLog(`🚫 **DETECT BOT**\n**IP:** \`${ip}\` melompati layer.`);
                return res.status(403).send("SECURITY : TIMING VIOLATION!");
            }

            // == TANDAI LINK SEBAGAI TERPAKAI (GHOST LINK) == \\
            usedLinks[linkID] = true;
        }

        // == STEP 0: INISIALISASI == \\
        if (currentStep === 0) {
            const sessionID = Math.random().toString(36).substring(2, 12);
            const nextKey = Math.random().toString(36).substring(2, 8);
            const waitTime = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;

            sessions[ip] = { 
                id: sessionID, 
                nextKey: nextKey, 
                lastTime: now, 
                startTime: now, // == MENCATAT WAKTU MULAI SESI == \\
                requiredWait: waitTime 
            };

            const script = generateNextLayer(host, currentPath, 1, sessionID, nextKey, waitTime);
            return res.status(200).send(script);
        }

        // == LAYER TENGAH == \\
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
            await sendWebhookLog(`✅ **SUCCESS EXECUTE**\n**IP:** \`${ip}\` berhasil melewati ${SETTINGS.TOTAL_LAYERS} layer.`);
            
            // == HAPUS SESI AGAR TIDAK BISA DI-FETCH ULANG == \\
            delete sessions[ip];
            
            return res.status(200).send(SETTINGS.REAL_SCRIPT.trim());
        }

    } catch (err) {
        return res.status(500).send("SECURITY : INTERNAL ERROR!");
    }
};
