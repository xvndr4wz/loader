const https = require('https');
const crypto = require('crypto'); // TAMBAH INI untuk random yang lebih secure

// ============================
// SETTINGS
// ============================
const SETTINGS = {
    WEBHOOK: process.env.DISCORD_WEBHOOK || "https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5",
    TOTAL_LAYERS: 5,
    MIN_WAIT: 112, // ms
    MAX_WAIT: 119, // ms
    SESSION_EXPIRY: 10000, // 10 detik
    KEY_LIFETIME: 5000,   // 5 detik
    TIMING_TOLERANCE: 10, // ✅ TAMBAH: Toleransi 10ms untuk network latency
    PLAIN_TEXT_RESP: "kenapa?",
    REAL_SCRIPT: `
        -- SCRIPT ASLI ANDA
        print("Ndraawz Security: Strict Timing & Bot Detection Active!")
        local p = game.Players.LocalPlayer
        if p.Character and p.Character:FindFirstChild("Humanoid") then
            p.Character.Humanoid.Health -= 50
        end
    `
};

// ==========================================
// MEMORY STORAGE
// ==========================================
let sessions = {}; 
let blacklist = {};
let ipRequestCount = {}; // ✅ TAMBAH: Track request per IP

// ==========================================
// HELPER FUNCTIONS
// ==========================================
function generateSecureID(length = 12) {
    // ✅ PERBAIKAN: Gunakan crypto untuk random yang lebih secure
    return crypto.randomBytes(length).toString('base64url').substring(0, length);
}

function getWIBTime() {
    return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        dateStyle: 'medium',
        timeStyle: 'medium'
    }).format(new Date());
}

async function sendWebhookLog(message) {
    const data = JSON.stringify({ 
        embeds: [{
            title: "❗️Ndraawz Security❗️",
            description: message,
            color: 0xff0000,
            footer: { text: "Ndraawz Security | WIB: " + getWIBTime() }
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

    return new Promise(function(resolve) {
        const req = https.request(options, function(res) {
            res.on('data', function() {});
            res.on('end', function() { resolve(true); });
        });
        req.on('error', function() { resolve(false); });
        req.write(data);
        req.end();
    });
}

// ✅ TAMBAH: Rate limiting per IP
function checkRateLimit(ip) {
    const now = Date.now();
    if (!ipRequestCount[ip]) {
        ipRequestCount[ip] = { count: 1, firstRequest: now };
        return true;
    }
    
    // Reset setiap 60 detik
    if (now - ipRequestCount[ip].firstRequest > 60000) {
        ipRequestCount[ip] = { count: 1, firstRequest: now };
        return true;
    }
    
    ipRequestCount[ip].count++;
    
    // Max 20 request per menit
    if (ipRequestCount[ip].count > 20) {
        return false;
    }
    
    return true;
}

// ==========================================
// MAIN HANDLER
// ==========================================
module.exports = async function(req, res) {
    res.setHeader('Content-Type', 'text/plain');
    
    const now = Date.now();
    const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0] || "unknown";
    const agent = req.headers['user-agent'] || "";
    
    // == 1. GATEKEEPER : CEK ROBLOX USER-AGENT == \\
    const isRoblox = agent.includes("Roblox") || req.headers['roblox-id'];
    if (!isRoblox) {
        return res.status(200).send(SETTINGS.PLAIN_TEXT_RESP);
    }

    // == 2. BLACKLIST CHECK == \\
    if (blacklist[ip] === true) {
        return res.status(403).send("SECURITY : BANNED ACCESS!");
    }

    // ✅ 3. RATE LIMIT CHECK
    if (!checkRateLimit(ip)) {
        blacklist[ip] = true;
        await sendWebhookLog("🚫 **RATE LIMIT**\n**IP:** `" + ip + "` melebihi 20 req/menit");
        return res.status(429).send("SECURITY : TOO MANY REQUESTS!");
    }

    // == PARSING URL == \\
    const urlParts = req.url.split('?');
    const queryString = urlParts[1] || "";
    const params = queryString.split('.');
    
    const step = params[0]; 
    const id = params[1];   
    const key = params[2];  
    
    const currentStep = parseInt(step) || 0;
    const host = req.headers.host;
    const currentPath = urlParts[0];

    try {
        // == 4. HANDSHAKE VALIDATION (STEP > 0) == \\
        if (currentStep > 0) {
            const session = sessions[id];

            // ✅ CHECK: Session exists?
            if (!session) {
                return res.status(403).send("SECURITY : SESSION NOT FOUND.");
            }

            // ✅ CHECK: IP Lock
            if (session.ownerIP !== ip) {
                return res.status(403).send("SECURITY : IP MISMATCH.");
            }

            // ✅ CHECK: One-time use
            if (session.used === true) {
                blacklist[ip] = true;
                await sendWebhookLog("🚫 **REPLAY ATTACK**\n**IP:** `" + ip + "`");
                return res.status(403).send("SECURITY : LINK EXPIRED (OTP).");
            }

            // ✅ CHECK: Session expiry (total time)
            const totalDuration = now - session.startTime;
            if (totalDuration > SETTINGS.SESSION_EXPIRY) {
                delete sessions[id];
                return res.status(403).send("SECURITY : SESSION EXPIRED.");
            }

            // ✅ CHECK: Key expiry (per-key timeout)
            const keyAge = now - session.keyCreatedAt;
            if (keyAge > SETTINGS.KEY_LIFETIME) {
                delete sessions[id];
                return res.status(403).send("SECURITY : KEY EXPIRED.");
            }

            // ✅✅✅ CRITICAL FIX: STRICT TIMING VALIDATION ✅✅✅
            const timeSinceKeyCreation = now - session.keyCreatedAt;
            const minAllowedTime = session.requiredWait - SETTINGS.TIMING_TOLERANCE;
            
            // Bot detection: request terlalu cepat
            if (timeSinceKeyCreation < minAllowedTime) {
                blacklist[ip] = true;
                delete sessions[id];
                await sendWebhookLog(
                    "🚫 **BOT DETECTED (TIMING)**\n" +
                    "**IP:** `" + ip + "`\n" +
                    "**Actual:** " + timeSinceKeyCreation + "ms\n" +
                    "**Required:** " + session.requiredWait + "ms\n" +
                    "**Difference:** -" + (session.requiredWait - timeSinceKeyCreation) + "ms"
                );
                return res.status(403).send("SECURITY : TIMING VIOLATION.");
            }

            // ✅ CHECK: Key handshake
            if (session.nextKey !== key) {
                delete sessions[id];
                return res.status(403).send("SECURITY : HANDSHAKE ERROR.");
            }

            // ✅ Mark as used AFTER all validations pass
            session.used = true;
        }
        
        // == 5. LAYER 0: INISIALISASI SESI == \\
        if (currentStep === 0) {
            const newSessionID = generateSecureID(12); // ✅ Secure random
            const nextKey = generateSecureID(8);
            const waitTime = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;

            sessions[newSessionID] = { 
                ownerIP: ip, 
                nextKey: nextKey, 
                startTime: now,
                keyCreatedAt: now,
                requiredWait: waitTime, 
                used: false 
            };

            const nextUrl = "https://" + host + currentPath + "?" + "1." + newSessionID + "." + nextKey;
            const luaScript = "-- Layer 1\ntask.wait(" + (waitTime / 1000) + ")\nloadstring(game:HttpGet(\"" + nextUrl + "\"))()";
            
            return res.status(200).send(luaScript);
        }

        // == 6. LAYER 1-4: ROTASI GHOST ID == \\
        if (currentStep < SETTINGS.TOTAL_LAYERS) {
            const nextStepNumber = currentStep + 1;
            const newSessionID = generateSecureID(12); // ✅ Secure random
            const nextKey = generateSecureID(8);
            const waitTime = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;

            // ✅ Copy data dari session lama ke session baru
            sessions[newSessionID] = { 
                ownerIP: sessions[id].ownerIP,
                nextKey: nextKey,
                startTime: sessions[id].startTime, // Keep original start time
                keyCreatedAt: now, // ✅ CRITICAL: Reset untuk timing check berikutnya
                requiredWait: waitTime,
                used: false 
            };
            
            // ✅ Hapus session lama (ghost link)
            delete sessions[id]; 

            const nextUrl = "https://" + host + currentPath + "?" + nextStepNumber + "." + newSessionID + "." + nextKey;
            const luaScript = "-- Layer " + nextStepNumber + "\ntask.wait(" + (waitTime / 1000) + ")\nloadstring(game:HttpGet(\"" + nextUrl + "\"))()";

            return res.status(200).send(luaScript);
        }

        // == 7. LAYER 5: FINAL SCRIPT == \\
        if (currentStep === SETTINGS.TOTAL_LAYERS) {
            await sendWebhookLog("✅ **SUCCESS**\n**IP:** `" + ip + "` tembus " + SETTINGS.TOTAL_LAYERS + " layer.");
            delete sessions[id];
            return res.status(200).send(SETTINGS.REAL_SCRIPT.trim());
        }

    } catch (err) {
        console.error("Error:", err); // ✅ Log error untuk debugging
        return res.status(500).send("SECURITY : INTERNAL ERROR!");
    }
};

// ✅ TAMBAH: Cleanup expired sessions setiap 30 detik
setInterval(function() {
    const now = Date.now();
    Object.keys(sessions).forEach(function(id) {
        const session = sessions[id];
        if (now - session.startTime > SETTINGS.SESSION_EXPIRY) {
            delete sessions[id];
        }
    });
    
    // Cleanup rate limit tracking
    Object.keys(ipRequestCount).forEach(function(ip) {
        if (now - ipRequestCount[ip].firstRequest > 60000) {
            delete ipRequestCount[ip];
        }
    });
}, 30000);
