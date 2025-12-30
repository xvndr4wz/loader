const https = require('https');

// ============================
// SETTINGS
// ============================
const SETTINGS = {
    WEBHOOK: "https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5",
    TOTAL_LAYERS: 5,
    MIN_WAIT: 112, // = JEDA MINIMAL (MS) = \\
    MAX_WAIT: 119, // = JEDA MAXIMAL (MS) = \\
    SESSION_EXPIRY: 10000, 
    KEY_LIFETIME: 5000,   
    PLAIN_TEXT_RESP: "kenapa?",
    REAL_SCRIPT: `print("Ndraawz Security: Ultra Strict Timing Active!")`
};

// ==========================================
// MEMORY STORAGE
// ==========================================
let sessions = {}; 
let blacklist = {}; 
let lastRequestTime = {}; // Menyimpan waktu terakhir IP akses Step 0

// ==========================================
//  FUNGSI WEBHOOK
// ==========================================
async function sendWebhookLog(message) {
    const data = JSON.stringify({ 
        embeds: [{
            title: "❗️Ndraawz Security❗️",
            description: message,
            color: 0xff0000,
            footer: { text: "WIB: " + new Date().toLocaleString("id-ID", {timeZone: "Asia/Jakarta"}) }
        }]
    });

    const url = new URL(SETTINGS.WEBHOOK);
    const options = {
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    };

    const req = https.request(options);
    req.write(data);
    req.end();
}

// ==========================================
// MAIN HANDLER
// ==========================================
module.exports = async function(req, res) {
    res.setHeader('Content-Type', 'text/plain');
    
    const now = Date.now();
    const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0] || "unknown";
    const agent = req.headers['user-agent'] || "";
    
    // == 1. GATEKEEPER : USER-AGENT CHECK == \\
    const isRoblox = agent.includes("Roblox") || req.headers['roblox-id'];
    if (!isRoblox) {
        return res.status(200).send(SETTINGS.PLAIN_TEXT_RESP);
    }

    // == 2. BLACKLIST CHECK == \\
    if (blacklist[ip] === true) {
        return res.status(403).send("SECURITY : BANNED ACCESS!");
    }

    // == PARSING URL == \\
    const urlParts = req.url.split('?');
    const queryString = urlParts[1] || "";
    const params = queryString.split('.');
    
    const step = params[0]; 
    const id = params[1];   
    const key = params[2];  
    const currentStep = parseInt(step) || 0;

    try {
        // == 3. VALIDASI LAYER (STEP > 0) == \\
        if (currentStep > 0) {
            const session = sessions[id];

            if (!session) return res.status(403).send("SECURITY : SESSION NOT FOUND.");
            if (session.ownerIP !== ip) return res.status(403).send("SECURITY : IP MISMATCH.");
            if (session.used) {
                blacklist[ip] = true;
                await sendWebhookLog(`🚫 **REPLAY ATTACK**\nIP: \`${ip}\``);
                return res.status(403).send("SECURITY : EXPIRED.");
            }

            // --- ULTRA STRICT TIMING LOGIC ---
            // Kita hitung selisih waktu dari sejak request sebelumnya SELESAI dikirim
            const timeDiff = now - session.keyCreatedAt;
            
            // Berikan toleransi sangat kecil (misal 5ms) untuk network jitter, 
            // tapi Python biasanya akan jauh lebih cepat.
            if (timeDiff < session.requiredWait) {
                blacklist[ip] = true;
                delete sessions[id];
                await sendWebhookLog(`🚫 **TIMING VIOLATION**\nIP: \`${ip}\` mengirim dalam ${timeDiff}ms (Butuh ${session.requiredWait}ms)`);
                return res.status(403).send("SECURITY : TIMING VIOLATION.");
            }

            session.used = true;
        }

        // == 4. INISIALISASI SESI (STEP 0) == \\
        if (currentStep === 0) {
            // Anti-Spam Step 0: Jika IP yang sama minta link baru dalam waktu < 1 detik
            if (lastRequestTime[ip] && (now - lastRequestTime[ip] < 1000)) {
                blacklist[ip] = true;
                await sendWebhookLog(`🚫 **SPAM DETECTED**\nIP: \`${ip}\` spamming Step 0.`);
                return res.status(403).send("SECURITY : SPAM DETECTED.");
            }
            lastRequestTime[ip] = now;

            const newSessionID = Math.random().toString(36).substring(2, 12);
            const nextKey = Math.random().toString(36).substring(2, 8);
            const waitTime = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;

            sessions[newSessionID] = { 
                ownerIP: ip, 
                nextKey: nextKey, 
                keyCreatedAt: now, 
                requiredWait: waitTime, 
                startTime: now,
                used: false 
            };

            const nextUrl = `https://${req.headers.host}${urlParts[0]}?1.${newSessionID}.${nextKey}`;
            return res.status(200).send(`-- Layer 1\ntask.wait(${waitTime / 1000})\nloadstring(game:HttpGet("${nextUrl}"))()`);
        }

        // == 5. LAYER GENERATOR == \\
        if (currentStep < SETTINGS.TOTAL_LAYERS) {
            const nextStep = currentStep + 1;
            const newID = Math.random().toString(36).substring(2, 12);
            const nextK = Math.random().toString(36).substring(2, 8);
            const nextWait = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;

            sessions[newID] = {
                ownerIP: ip,
                nextKey: nextK,
                keyCreatedAt: Date.now(), // Reset stampel waktu di sini
                requiredWait: nextWait,
                startTime: sessions[id].startTime,
                used: false
            };
            
            delete sessions[id];
            const nextUrl = `https://${req.headers.host}${urlParts[0]}?${nextStep}.${newID}.${nextK}`;
            return res.status(200).send(`-- Layer ${nextStep}\ntask.wait(${nextWait / 1000})\nloadstring(game:HttpGet("${nextUrl}"))()`);
        }

        // == 6. FINAL == \\
        if (currentStep === SETTINGS.TOTAL_LAYERS) {
            delete sessions[id];
            await sendWebhookLog(`✅ **SUCCESS**\nIP: \`${ip}\` cleared all layers.`);
            return res.status(200).send(SETTINGS.REAL_SCRIPT);
        }

    } catch (e) {
        return res.status(500).send("INTERNAL ERROR");
    }
};
