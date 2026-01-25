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
    BASE_PATH: "/api/script/", // Sesuaikan dengan path endpoint kamu
    REAL_SCRIPT: `
        print("Ndraawz Security: Path-Based Logic Active!")
        local p = game.Players.LocalPlayer
        if p.Character and p.Character:FindFirstChild("Humanoid") then
            p.Character.Humanoid.Health -= 50
        end
    `
};

let sessions = {}; 
let blacklist = {}; 

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
function getRandomError() {
    const errorCodes = [400, 401, 403, 404, 500, 502, 503];
    return errorCodes[Math.floor(Math.random() * errorCodes.length)];
}

function generateComplexID(length) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789~_-";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
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
            title: "❗️Ndraawz Security Path❗️",
            description: message,
            color: 0xff0000,
            footer: { text: "Ndraawz Security | WIB: " + getWIBTime() }
        }]
    });

    const url = new URL(SETTINGS.WEBHOOK);
    const options = {
        hostname: url.hostname, path: url.pathname, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    };

    return new Promise((resolve) => {
        const req = https.request(options, (res) => {
            res.on('data', () => {});
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
    const agent = req.headers['user-agent'] || "";
    
    // == GATEKEEPER == \\
    const isRoblox = agent.includes("Roblox"); 
    if (!isRoblox || blacklist[ip]) {
        return res.status(getRandomError()).send("SECURITY : BANNED ACCESS!");
    }

    // == PARSING PATH (CONTOH: /api/script/1.id.key) == \\
    const urlParts = req.url.split('/');
    const lastPart = urlParts[urlParts.length - 1] || "";
    const params = lastPart.split('.');
    
    const step = params[0]; 
    const id = params[1];   
    const key = params[2];  
    
    const currentStep = parseInt(step) || 0;
    const host = req.headers.host;

    try {
        if (currentStep > 0) {
            const session = sessions[id];

            if (!session || session.ownerIP !== ip) {
                return res.status(getRandomError()).send("SECURITY : SESSION INVALID!");
            }

            const expectedStep = session.stepSequence[session.currentIndex];
            if (currentStep !== expectedStep || session.nextKey !== key) {
                delete sessions[id];
                return res.status(getRandomError()).send("SECURITY : HANDSHAKE FAILED!");
            }

            if (session.used) {
                blacklist[ip] = true;
                await sendWebhookLog("🚫 **REPLAY ATTACK**\n**IP:** `" + ip + "`");
                return res.status(getRandomError()).send("SECURITY : EXPIRED!");
            }

            const timeSinceLast = now - session.lastTime;
            if (timeSinceLast < session.requiredWait) {
                blacklist[ip] = true;
                delete sessions[id];
                await sendWebhookLog("🚫 **BOT DETECTED (TIMING)**\n**IP:** `" + ip + "`");
                return res.status(getRandomError()).send("SECURITY : TOO FAST!");
            }
            session.used = true;
        }
        
        // == INITIALIZE OR NEXT STEP == \\
        if (currentStep === 0 || (sessions[id] && sessions[id].currentIndex < SETTINGS.TOTAL_LAYERS - 1)) {
            
            let sequence, currentIndex, startTime;

            if (currentStep === 0) {
                // Buat sequence baru
                sequence = [];
                while(sequence.length < SETTINGS.TOTAL_LAYERS) {
                    let r = Math.floor(Math.random() * 900) + 100; // Step lebih panjang (100-999)
                    if(!sequence.includes(r)) sequence.push(r);
                }
                currentIndex = 0;
                startTime = now;
            } else {
                sequence = sessions[id].stepSequence;
                currentIndex = sessions[id].currentIndex + 1;
                startTime = sessions[id].startTime;
                delete sessions[id]; // Hapus ID lama (Rotation)
            }

            const newID = generateComplexID(8);
            const nextKey = generateComplexID(12);
            const waitTime = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;

            sessions[newID] = { 
                ownerIP: ip, 
                stepSequence: sequence,
                currentIndex: currentIndex,
                nextKey: nextKey, 
                lastTime: now, 
                startTime: startTime, 
                keyCreatedAt: now, 
                requiredWait: waitTime, 
                used: false 
            };

            const nextStepValue = sequence[currentIndex];
            // Format URL baru: /api/script/STEP.ID.KEY
            const nextUrl = "https://" + host + SETTINGS.BASE_PATH + nextStepValue + "." + newID + "." + nextKey;
            
            const luaScript = `task.wait(${waitTime / 1000}) loadstring(game:HttpGet("${nextUrl}"))()`;
            return res.status(200).send(luaScript);
        }

        // == FINAL SCRIPT == \\
        if (sessions[id] && sessions[id].currentIndex === SETTINGS.TOTAL_LAYERS - 1) {
            await sendWebhookLog("✅ **SUCCESS**\n**IP:** `" + ip + "` tembus Path Security.");
            delete sessions[id];
            return res.status(200).send(SETTINGS.REAL_SCRIPT.trim());
        }

    } catch (err) {
        return res.status(500).send("INTERNAL ERROR");
    }
};
