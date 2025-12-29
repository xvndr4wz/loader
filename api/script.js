const https = require('https');
const crypto = require('crypto');

// === SETTINGS === \\
const SETTINGS = {
    SECRET_SALT: "NDRAAWZGANTENG",
    WEBHOOK: "https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5",
    TOTAL_LAYERS: 5,
    MIN_WAIT: 50, // = JEDA MINIMAL (MS) = \\
    MAX_WAIT: 100, // = JEDA MAXIMAL (MS) = \\
    PLAIN_TEXT_RESP: "https://ndraawzz-developer.vercel.app/api/script",
    
    // [GHOST FETCH SETTINGS]
    // Masukkan link script asli lu di sini (Contoh: Pastebin Raw / API Lu)
    // Link ini TIDAK AKAN PERNAH terlihat di HTTP Spy user!
    HIDDEN_SOURCE_URL: "https://raw.githubusercontent.com/xvndr4wz/loader/refs/heads/main/WallHop",

    REAL_SCRIPT: `
        -- SCRIPT ASLI ANDA (CADANGAN)
        print("ZiFi Security: Script Verified and Loaded!")
    `
};

// === MEMORY === \\
let sessions = {};
let blacklist = {}; 

// === FUNGSI INTERNAL FETCH (GHOST ENGINE) === \\
async function fetchInternalScript(url) {
    return new Promise((resolve) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', () => resolve(null));
    });
}

// === FUNGSI WEBHOOK EMBED === \\
async function sendWebhookLog(msg) {
    const data = JSON.stringify({ 
        embeds: [{
            title: "❗️Ndraawz Security❗️",
            description: msg,
            color: 0xff0000,
            footer: { text: "Ndraawz | " + new Date().toLocaleString() }
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
            
            // == VERIFIKASI INTEGRITAS KEY / KUNCI == \\
            if (!session || session.id !== id || session.nextKey !== key) {
                return res.status(200).send("SECURITY : HANDSHAKE ERROR.");
            }

            // == VERIFIKASI KECEPATAN (ANTI BOT) == \\
            const timeDiff = now - session.lastTime;
            if (timeDiff < session.requiredWait) {
                blacklist[ip] = true;
                await sendWebhookLog(`🚫 **DETECT BOT**\n**IP:** \`${ip}\` melompati layer terlalu cepat.`);
                return res.status(403).send("SECURITY : TIMING VIOLATION!");
            }
        }

        // == EKSEKUSI STEP == \\
        if (currentStep === 0) {
            const sessionID = Math.random().toString(36).substring(2, 12);
            const nextKey = Math.random().toString(36).substring(2, 8);
            const waitTime = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;

            sessions[ip] = { id: sessionID, nextKey: nextKey, lastTime: now, requiredWait: waitTime };

            const script = generateNextLayer(host, currentPath, 1, sessionID, nextKey, waitTime);
            return res.status(200).send(script);
        }

        // == PROSES LAYER TENGAH == \\
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
            await sendWebhookLog(`✅ **SUCCESS**\n**IP:** \`${ip}\` berhasil melewati ${SETTINGS.TOTAL_LAYERS} layer.`);
            
            // [GHOST FETCH EXECUTION]
            // Server lu narik script dari URL rahasia lu secara internal
            let finalContent = await fetchInternalScript(SETTINGS.HIDDEN_SOURCE_URL);
            
            // Kalo fetch gagal, pake script fallback di settings
            if (!finalContent) finalContent = SETTINGS.REAL_SCRIPT;

            delete sessions[ip];
            return res.status(200).send(finalContent.trim());
        }

    } catch (err) {
        return res.status(500).send("SECURITY : INTERNAL ERROR!");
    }
};
