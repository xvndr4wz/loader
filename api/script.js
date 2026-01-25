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
    REAL_SCRIPT: `
        -- SCRIPT ASLI ANDA
        print("Ndraawz Security: 100% Always Random Logic Active!")
        local p = game.Players.LocalPlayer
        if p.Character and p.Character:FindFirstChild("Humanoid") then
            p.Character.Humanoid.Health -= 50
        end
    `
};

let sessions = {}; 
let blacklist = {}; 

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
        timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'medium'
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
        hostname: url.hostname, path: url.pathname, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    };
    return new Promise((resolve) => {
        const req = https.request(options, (res) => {
            res.on('data', () => {}); res.on('end', () => resolve(true));
        });
        req.on('error', () => resolve(false));
        req.write(data); req.end();
    });
}

// ==========================================
// MAIN HANDLER
// ==========================================
module.exports = async function(req, res) {
    const now = Date.now();
    const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0] || "unknown";
    const agent = req.headers['user-agent'] || "";
    const host = req.headers.host;

    // MATIKAN CACHE AGAR LINK SELALU BARU SAAT REFRESH
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // == PARSING URL == \\
    const urlParts = req.url.split('?');
    const currentPath = urlParts[0];
    const queryString = urlParts[1] || "";
    const params = queryString.split('.');
    
    const step = params[0]; 
    const id = params[1];   
    const key = params[2];  
    const currentStep = parseInt(step) || 0;

    const isRoblox = agent.includes("Roblox") && (req.headers['roblox-id'] || req.headers['x-roblox-place-id'] || agent.includes("RobloxApp"));

    // == LOGIKA SELALU ACAK DI BROWSER == \\
    if (!isRoblox && currentStep === 0) {
        // Generate kode unik secara real-time
        const randomStep = Math.floor(Math.random() * 900) + 100;
        const randomID = generateComplexID(10);
        const randomKey = generateComplexID(16);
        
        // Link yang akan muncul di address bar Chrome
        const randomUrl = `https://${host}${currentPath}?${randomStep}.${randomID}.${randomKey}`;
        
        // Gunakan 307 (Temporary Redirect) agar browser tidak menyimpan link ini secara permanen
        res.writeHead(307, { 'Location': randomUrl });
        return res.end();
    }

    // == GATEKEEPER ROBLOX == \\
    if (!isRoblox) {
        res.setHeader('Content-Type', 'text/plain');
        return res.status(200).send("Ndraawz Security: Banned Device (Chrome Access Logged).");
    }

    if (blacklist[ip] === true) {
        return res.status(getRandomError()).send("SECURITY : BANNED ACCESS!");
    }

    try {
        // == HANDSHAKE LOGIC (SAMA SEPERTI ASLI) == \\
        if (currentStep > 0) {
            const session = sessions[id];
            if (session === undefined || session.ownerIP !== ip) {
                return res.status(getRandomError()).send("SECURITY : BANNED ACCESS!");
            }
            const expectedStep = session.stepSequence[session.currentIndex];
            if (currentStep !== expectedStep || session.nextKey !== key) {
                delete sessions[id];
                return res.status(getRandomError()).send("SECURITY : BANNED ACCESS!");
            }
            if (session.used === true) {
                blacklist[ip] = true;
                await sendWebhookLog("🚫 **REPLAY ATTACK**\n**IP:** `" + ip + "`");
                return res.status(getRandomError()).send("SECURITY : BANNED ACCESS!");
            }
            if (now - session.startTime > SETTINGS.SESSION_EXPIRY || now - session.keyCreatedAt > SETTINGS.KEY_LIFETIME) {
                delete sessions[id];
                return res.status(getRandomError()).send("SECURITY : BANNED ACCESS!");
            }
            if (now - session.lastTime < session.requiredWait) {
                blacklist[ip] = true;
                delete sessions[id];
                await sendWebhookLog("🚫 **DETECT BOT**\n**IP:** `" + ip + "` timing violation.");
                return res.status(getRandomError()).send("SECURITY : BANNED ACCESS!");
            }
            session.used = true;
        }
        
        // == INITIALIZE / NEXT LAYER == \\
        if (currentStep === 0 || (sessions[id] && sessions[id].currentIndex < SETTINGS.TOTAL_LAYERS - 1)) {
            let sequence, currentIndex, startTime;
            if (currentStep === 0) {
                sequence = [];
                while(sequence.length < SETTINGS.TOTAL_LAYERS) {
                    let r = Math.floor(Math.random() * 300) + 1;
                    if(!sequence.includes(r)) sequence.push(r);
                }
                currentIndex = 0;
                startTime = now;
            } else {
                sequence = sessions[id].stepSequence;
                currentIndex = sessions[id].currentIndex + 1;
                startTime = sessions[id].startTime;
                delete sessions[id]; 
            }

            const newSessionID = generateComplexID(8);
            const nextKey = generateComplexID(12);
            const waitTime = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;

            sessions[newSessionID] = { 
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

            const nextStepNumber = sequence[currentIndex];
            const nextUrl = `https://${host}${currentPath}?${nextStepNumber}.${newSessionID}.${nextKey}`;
            
            res.setHeader('Content-Type', 'text/plain');
            return res.status(200).send(`task.wait(${waitTime / 1000}) loadstring(game:HttpGet("${nextUrl}"))()`);
        }

        // == FINAL == \\
        if (sessions[id].currentIndex === SETTINGS.TOTAL_LAYERS - 1) {
            await sendWebhookLog("✅ **SUCCESS**\n**IP:** `" + ip + "` tembus security.");
            delete sessions[id];
            res.setHeader('Content-Type', 'text/plain');
            return res.status(200).send(SETTINGS.REAL_SCRIPT.trim());
        }

    } catch (err) {
        return res.status(getRandomError()).send("SECURITY : BANNED ACCESS!");
    }
};
