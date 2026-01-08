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
    PLAIN_TEXT_RESP: "NGAPAIN LU?", 
    ALLOWED_PLACE_IDS: ["123456789", "987654321"], // <== Masukkan ID Map kamu di sini (String)
    REAL_SCRIPT: `
        -- SCRIPT ASLI ANDA
        print("Ndraawz Security: Authorized Game Session!")
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

    const req = https.request(options);
    req.write(data);
    req.end();
}

// Cleaning
setInterval(() => {
    const now = Date.now();
    for (const id in sessions) {
        if (now - sessions[id].startTime > SETTINGS.SESSION_EXPIRY + 2000) delete sessions[id];
    }
}, 30000);

// ==========================================
// MAIN HANDLER
// ==========================================
module.exports = async function(req, res) {
    res.setHeader('Content-Type', 'text/plain');
    
    const now = Date.now();
    const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0] || "unknown";
    const agent = req.headers['user-agent'] || "";
    
    // == PENGECEKAN HEADER INTERNAL ROBLOX == \\
    const robloxPlaceId = req.headers['x-roblox-place-id']; // ID Map
    const robloxId = req.headers['roblox-id'];             // Session ID Roblox
    
    // Gatekeeper: Harus ada User-Agent Roblox DAN harus ada ID Map (Place ID)
    const isRoblox = agent.includes("Roblox") && robloxPlaceId;

    if (!isRoblox) {
        // Jika bot atau browser (tidak punya Place ID header), langsung 403
        return res.status(403).send(SETTINGS.PLAIN_TEXT_RESP);
    }

    // == PENGECEKAN WHITELIST MAP == \\
    if (SETTINGS.ALLOWED_PLACE_IDS.length > 0) {
        if (!SETTINGS.ALLOWED_PLACE_IDS.includes(robloxPlaceId)) {
            return res.status(403).send("SECURITY : UNAUTHORIZED GAME / PLACE ID.");
        }
    }

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
    const host = req.headers.host;
    const currentPath = urlParts[0];

    try {
        // == HANDSHAKE LOGIC == \\
        if (currentStep > 0) {
            const session = sessions[id];

            if (session === undefined) return res.status(403).send("SECURITY : SESSION NOT FOUND.");
            if (session.ownerIP !== ip) return res.status(403).send("SECURITY : IP MISMATCH.");

            const expectedStep = session.stepSequence[session.currentIndex];
            if (currentStep !== expectedStep) {
                delete sessions[id];
                return res.status(403).send("SECURITY : INVALID SEQUENCE.");
            }

            if (session.used === true) {
                blacklist[ip] = true;
                await sendWebhookLog("🚫 **REPLAY ATTACK**\n**IP:** `" + ip + "`");
                return res.status(403).send("SECURITY : LINK EXPIRED.");
            }

            if (now - session.startTime > SETTINGS.SESSION_EXPIRY) {
                delete sessions[id];
                return res.status(403).send("SECURITY : SESSION EXPIRED.");
            }

            if (session.nextKey !== key) {
                delete sessions[id];
                return res.status(403).send("SECURITY : HANDSHAKE ERROR.");
            }

            if (now - session.lastTime < session.requiredWait) {
                blacklist[ip] = true;
                delete sessions[id];
                await sendWebhookLog("🚫 **DETECT BOT**\n**IP:** `" + ip + "` timing violation.");
                return res.status(403).send("SECURITY : TIMING VIOLATION.");
            }
            session.used = true;
        }
        
        // == STEP 0: INISIALISASI == \\
        if (currentStep === 0) {
            const ipPart = ip.split('.').pop() || "0";
            const seed = parseInt(ipPart) + Math.floor(Math.random() * 10000);
            const newSessionID = seed.toString(36).substring(0, 4).padEnd(4, 'x');
            const nextKey = Math.random().toString(36).substring(2, 8);
            const waitTime = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;

            let sequence = [];
            while(sequence.length < SETTINGS.TOTAL_LAYERS) {
                let r = Math.floor(Math.random() * 300) + 1;
                if(!sequence.includes(r)) sequence.push(r);
            }

            sessions[newSessionID] = { 
                ownerIP: ip, 
                stepSequence: sequence,
                currentIndex: 0,
                nextKey: nextKey, 
                lastTime: now, 
                startTime: now, 
                requiredWait: waitTime, 
                used: false 
            };

            const nextUrl = "https://" + host + currentPath + "?" + sequence[0] + "." + newSessionID + "." + nextKey;
            const luaScript = "-- RAWR\ntask.wait(" + (waitTime / 1000) + ")\nloadstring(game:HttpGet(\"" + nextUrl + "\"))()";
            
            return res.status(200).send(luaScript);
        }

        // == LAYER ROTATION == \\
        if (sessions[id].currentIndex < SETTINGS.TOTAL_LAYERS - 1) {
            const session = sessions[id];
            session.currentIndex++; 
            
            const seed = Math.floor(Math.random() * 10000);
            const newSessionID = seed.toString(36).substring(0, 4).padEnd(4, 'x');
            const nextStepNumber = session.stepSequence[session.currentIndex];
            const nextKey = Math.random().toString(36).substring(2, 8); 
            const waitTime = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;

            sessions[newSessionID] = { 
                ...session,
                currentIndex: session.currentIndex,
                nextKey: nextKey, 
                lastTime: now, 
                requiredWait: waitTime, 
                used: false 
            };
            
            delete sessions[id]; 

            const nextUrl = "https://" + host + currentPath + "?" + nextStepNumber + "." + newSessionID + "." + nextKey;
            const luaScript = "-- RAWR " + (session.currentIndex + 1) + "\ntask.wait(" + (waitTime / 1000) + ")\nloadstring(game:HttpGet(\"" + nextUrl + "\"))()";

            return res.status(200).send(luaScript);
        }

        // == FINAL PAYLOAD == \\
        if (sessions[id].currentIndex === SETTINGS.TOTAL_LAYERS - 1) {
            await sendWebhookLog("✅ **SUCCESS**\n**IP:** `" + ip + "` tembus " + SETTINGS.TOTAL_LAYERS + " layer.");
            delete sessions[id];
            return res.status(200).send(SETTINGS.REAL_SCRIPT.trim());
        }

    } catch (err) {
        return res.status(500).send("SECURITY : INTERNAL ERROR!");
    }
};
