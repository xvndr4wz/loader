const https = require('https');
const crypto = require('crypto');

// === SETTINGS === \\
const SETTINGS = {
    SECRET_SALT: "NDRAAWZGANTENG",
    WEBHOOK: "https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5",
    TOTAL_LAYERS: 5,
    MIN_WAIT: 112, // = JEDA MINIMAL (MS) = \\
    MAX_WAIT: 119, // = JEDA MAXIMAL (MS) = \\
    SESSION_EXPIRY: 10000, // == TOTAL SESI EXPIRED DALAM 10 DETIK (MS) == \\
    KEY_LIFETIME: 5000, // == KEY/ID EXPIRY: MATI DALAM 5 DETIK (MS) == \\
    PLAIN_TEXT_RESP: "kenapa?",
    REAL_SCRIPT: `
        -- SCRIPT ASLI ANDA
        print("ZiFi Security: Double Random (ID & Key) Verified!")
        local p = game.Players.LocalPlayer
        if p.Character and p.Character:FindFirstChild("Humanoid") then
            p.Character.Humanoid.Health -= 50
        end
    `
};

// === MEMORY === \\
let sessions = {}; // == DATABASE SESI SEMENTARA == \\
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

// === FUNGSI LAYER (URL DOUBLE RANDOM) === \\
function generateNextLayer(host, currentPath, step, id, nextKey, nextWait) {
    // ID dan Key yang dikirim di sini adalah ID/Key baru yang sudah diacak
    return `-- Layer ${step}\ntask.wait(${nextWait/1000})\nloadstring(game:HttpGet("https://${host}${currentPath}?step=${step}&id=${id}&key=${nextKey}"))()`;
}

// === MAIN HANDLER (EXPORT) === \\
module.exports = async (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    
    const now = Date.now();
    const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0] || "unknown";
    const agent = req.headers['user-agent'] || "";
    const { step, id, key } = req.query;
    const currentStep = parseInt(step) || 0;
    const host = req.headers.host;
    const currentPath = req.url.split('?')[0];

    // == VALIDASI USER AGENT (ROBLOX ONLY) == \\
    const isRoblox = agent.includes("Roblox") || req.headers['roblox-id'];
    if (!isRoblox) return sendPlainResponse(res);

    if (blacklist[ip]) return res.status(403).send("SECURITY : BANNED ACCESS!");

    try {
        if (currentStep > 0) {
            // Cari sesi berdasarkan ID yang dikirim (ID lama dari layer sebelumnya)
            const session = sessions[id]; 
            
            // == VERIFIKASI SESI == \\
            if (!session || session.ownerIP !== ip) return res.status(403).send("SECURITY : SESSION NOT FOUND.");

            // == VERIFIKASI KADALUWARSA SESI == \\
            if (now - session.startTime > SETTINGS.SESSION_EXPIRY) {
                delete sessions[id];
                return res.status(403).send("SECURITY : SESSION EXPIRED.");
            }

            // == VERIFIKASI KEY/ID LIFE (5 DETIK) == \\
            if (now - session.keyCreatedAt > SETTINGS.KEY_LIFETIME) {
                delete sessions[id];
                return res.status(403).send("SECURITY : KEY EXPIRED.");
            }
            
            // == VERIFIKASI KEY == \\
            if (session.nextKey !== key) {
                delete sessions[id];
                return res.status(200).send("SECURITY : HANDSHAKE ERROR.");
            }

            // == VERIFIKASI KECEPATAN (ANTI BOT) == \\
            if (now - session.lastTime < session.requiredWait) {
                blacklist[ip] = true;
                delete sessions[id];
                await sendWebhookLog(`🚫 **DETECT BOT**\n**IP:** \`${ip}\` melompati layer.`);
                return res.status(403).send("SECURITY : TIMING VIOLATION!");
            }
        }

        // == STEP 0: INISIALISASI == \\
        if (currentStep === 0) {
            const sessionID = Math.random().toString(36).substring(2, 12);
            const nextKey = Math.random().toString(36).substring(2, 8);
            const waitTime = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;

            sessions[sessionID] = { 
                ownerIP: ip,
                nextKey: nextKey, 
                lastTime: now, 
                startTime: now,
                keyCreatedAt: now,
                requiredWait: waitTime 
            };

            return res.status(200).send(generateNextLayer(host, currentPath, 1, sessionID, nextKey, waitTime));
        }

        // == LAYER TENGAH (MENGACAK ID DAN KEY BARU) == \\
        if (currentStep < SETTINGS.TOTAL_LAYERS) {
            const oldID = id;
            const newID = Math.random().toString(36).substring(2, 12); // == ACAK ID BARU == \\
            const nextKey = Math.random().toString(36).substring(2, 8); // == ACAK KEY BARU == \\
            const waitTime = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;

            // Pindahkan data dari ID lama ke ID baru
            sessions[newID] = {
                ...sessions[oldID],
                nextKey: nextKey,
                lastTime: now,
                keyCreatedAt: now,
                requiredWait: waitTime
            };

            delete sessions[oldID]; // == HAPUS ID LAMA (GHOST ID) == \\

            return res.status(200).send(generateNextLayer(host, currentPath, currentStep + 1, newID, nextKey, waitTime));
        }

        // == FINAL == \\
        if (currentStep === SETTINGS.TOTAL_LAYERS) {
            await sendWebhookLog(`✅ **SUCCESS**\n**IP:** \`${ip}\` tembus dengan Double Random ID/Key.`);
            delete sessions[id];
            return res.status(200).send(SETTINGS.REAL_SCRIPT.trim());
        }

    } catch (err) {
        return res.status(500).send("SECURITY : INTERNAL ERROR!");
    }
};
