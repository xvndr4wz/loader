const https = require('https');

// ============================
// SETTINGS
// ============================
const SETTINGS = {
    WEBHOOK: "https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5",
    TOTAL_LAYERS: 5,
    MIN_WAIT: 112, // = JEDA MINIMAL (MS) = \\
    MAX_WAIT: 119, // = JEDA MAXIMAL (MS) = \\
    SESSION_EXPIRY: 10000, // == TOTAL SESI EXPIRED (10 DETIK) == \\
    KEY_LIFETIME: 5000,   // == KEY/ID EXPIRED (5 DETIK) == \\
    PLAIN_TEXT_RESP: "kenapa?",
    REAL_SCRIPT: `
        -- SCRIPT ASLI ANDA
        print("Ndraawz Security: Logika Panjang & Eksplisit Active!")
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

// ==========================================
//  FUNGSI WEBHOOK EMBED
// ==========================================
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

// ==========================================
// MAIN HANDLER
// ==========================================
module.exports = async function(req, res) {
    res.setHeader('Content-Type', 'text/plain');
    
    const now = Date.now();
    const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0] || "unknown";
    const agent = req.headers['user-agent'] || "";
    
    // == PARSING URL (STEP, ID, KEY) == \\
    const urlParts = req.url.split('?');
    const queryString = urlParts[1] || "";
    const params = queryString.split('.');
    
    const step = params[0]; 
    const id = params[1];   
    const key = params[2];  
    
    const currentStep = parseInt(step) || 0;
    const host = req.headers.host;
    const currentPath = urlParts[0];

    // == GATEKEEPER : VALIDASI AWAL == \\
    const isRoblox = agent.includes("Roblox") || req.headers['roblox-id'];
    if (isRoblox === false) {
        return res.status(200).send(SETTINGS.PLAIN_TEXT_RESP);
    }

    if (blacklist[ip] === true) {
        return res.status(403).send("SECURITY : BANNED ACCESS!");
    }

    try {
        // == HANDSHAKE VALIDATION == \\
        if (currentStep > 0) {
            const session = sessions[id];

  // == CHECK APAKAH SESI ADA (GHOST LINK CHECK) == \\
            if (session === undefined) {
                return res.status(403).send("SECURITY : SESSION NOT FOUND.");
            }

            // == IP LOCK CHECK == \\
            if (session.ownerIP !== ip) {
                return res.status(403).send("SECURITY : IP MISMATCH / INVALID SESSION.");
            }

            //  == ONE-TIME USE == \\
            if (session.used === true) {
                blacklist[ip] = true;
                await sendWebhookLog("🚫 **REPLAY ATTACK**\n**IP:** `" + ip + "` mencoba akses ulang link mati.");
                return res.status(403).send("SECURITY : LINK EXPIRED (OTP).");
            }

            // == EXPIRY CHECK == \\
            const sessionDuration = now - session.startTime;
            const keyDuration = now - session.keyCreatedAt;
            if (sessionDuration > SETTINGS.SESSION_EXPIRY || keyDuration > SETTINGS.KEY_LIFETIME) {
                delete sessions[id];
                return res.status(403).send("SECURITY : SESSION/KEY EXPIRED.");
            }

            // == KEY & TIMING HANDSHAKE == \\
            if (session.nextKey !== key) {
                delete sessions[id];
                return res.status(403).send("SECURITY : HANDSHAKE ERROR.");
            }

            const timeSinceLastRequest = now - session.lastTime;
            if (timeSinceLastRequest < session.requiredWait) {
                blacklist[ip] = true;
                delete sessions[id];
                await sendWebhookLog("🚫 **DETECT BOT**\n**IP:** `" + ip + "` timing violation.");
                return res.status(403).send("SECURITY : TIMING VIOLATION.");
            }
            session.used = true;
        }
        
        // == INISIALISASI SESI PERTAMA == \\
        if (currentStep === 0) {
            const newSessionID = Math.random().toString(36).substring(2, 12);
            const nextKey = Math.random().toString(36).substring(2, 8);
            const waitTime = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;

            sessions[newSessionID] = { 
                ownerIP: ip, 
                nextKey: nextKey, 
                lastTime: now, 
                startTime: now, 
                keyCreatedAt: now, 
                requiredWait: waitTime, 
                used: false 
            };

            const nextUrl = "https://" + host + currentPath + "?" + "1." + newSessionID + "." + nextKey;
            const luaScript = "-- WHAT ARE YOU DOING, BRO?😝😝\ntask.wait(" + (waitTime / 1000) + ")\nloadstring(game:HttpGet(\"" + nextUrl + "\"))()";
            
            return res.status(200).send(luaScript);
        }

        // == ROTASI GHOST ID == \\
        if (currentStep < SETTINGS.TOTAL_LAYERS) {
            const nextStepNumber = currentStep + 1;
            const newSessionID = Math.random().toString(36).substring(2, 12); 
            const nextKey = Math.random().toString(36).substring(2, 8); 
            const waitTime = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;

            // == PINDAHKAN DATA KE ID BARU == \\
            sessions[newSessionID] = { 
                ownerIP: sessions[id].ownerIP,
                nextKey: nextKey, 
                lastTime: now, 
                startTime: sessions[id].startTime, 
                keyCreatedAt: now, 
                requiredWait: waitTime, 
                used: false 
            };
            
            // == REMOVE ID LAMA [GHOST LINK] == \\
            delete sessions[id]; 

            const nextUrl = "https://" + host + currentPath + "?" + nextStepNumber + "." + newSessionID + "." + nextKey;
            const luaScript = "-- Layer " + nextStepNumber + "\ntask.wait(" + (waitTime / 1000) + ")\nloadstring(game:HttpGet(\"" + nextUrl + "\"))()";

            return res.status(200).send(luaScript);
        }

        // == FINAL KIRIM SCRIPT == \\
        if (currentStep === SETTINGS.TOTAL_LAYERS) {
            await sendWebhookLog("✅ **SUCCESS**\n**IP:** `" + ip + "` tembus " + SETTINGS.TOTAL_LAYERS + " layer.");
            delete sessions[id];
            return res.status(200).send(SETTINGS.REAL_SCRIPT.trim());
        }

    } catch (err) {
        return res.status(500).send("SECURITY : INTERNAL ERROR!");
    }
};
