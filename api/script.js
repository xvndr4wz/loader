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
        print("Ndraawz Security: Logika Panjang & Eksplisit Active!")
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
    const now = Date.now();
    const host = req.headers.host;
    const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0] || "unknown";
    const agent = req.headers['user-agent'] || "";
    
    // ==========================================
    // LOGIKA KHUSUS BROWSER (REDIRECT ACAK)
    // ==========================================
    const isRoblox = agent.includes("Roblox");

    if (!isRoblox) {
        // Jika dibuka di browser (Chrome dll), buat path acak
        const randomSlug = Math.random().toString(36).substring(2, 12);
        
        // Cek jika akses link bersih (tanpa query parameter)
        if (!req.url.includes("?")) {
            res.writeHead(302, { 'Location': 'https://' + host + '/api/' + randomSlug });
            return res.end();
        }
        
        // Jika sudah redirect tapi masih di browser
        res.setHeader('Content-Type', 'text/plain');
        return res.status(403).send("SECURITY : BANNED ACCESS!");
    }

    // ==========================================
    // LOGIKA KEAMANAN ROBLOX (STRUKTUR ASLI)
    // ==========================================
    res.setHeader('Content-Type', 'text/plain');

    if (blacklist[ip] === true) {
        return res.status(getRandomError()).send("SECURITY : BANNED ACCESS!");
    }

    const urlParts = req.url.split('?');
    const queryString = urlParts[1] || "";
    const params = queryString.split('.');
    
    const step = params[0]; 
    const id = params[1];   
    const key = params[2];  
    
    const currentStep = parseInt(step) || 0;

    try {
        if (currentStep > 0) {
            const session = sessions[id];

            if (session === undefined) {
                return res.status(getRandomError()).send("SECURITY : BANNED ACCESS!");
            }

            if (session.ownerIP !== ip) {
                return res.status(getRandomError()).send("SECURITY : BANNED ACCESS!");
            }

            const expectedStep = session.stepSequence[session.currentIndex];
            if (currentStep !== expectedStep) {
                delete sessions[id];
                return res.status(getRandomError()).send("SECURITY : BANNED ACCESS!");
            }

            if (session.used === true) {
                blacklist[ip] = true;
                await sendWebhookLog("🚫 **REPLAY ATTACK**\n**IP:** `" + ip + "`");
                return res.status(getRandomError()).send("SECURITY : BANNED ACCESS!");
            }

            const sessionDuration = now - session.startTime;
            const keyDuration = now - session.keyCreatedAt;
            if (sessionDuration > SETTINGS.SESSION_EXPIRY || keyDuration > SETTINGS.KEY_LIFETIME) {
                delete sessions[id];
                return res.status(getRandomError()).send("SECURITY : BANNED ACCESS!");
            }

            if (session.nextKey !== key) {
                delete sessions[id];
                return res.status(getRandomError()).send("SECURITY : BANNED ACCESS!");
            }

            const timeSinceLastRequest = now - session.lastTime;
            if (timeSinceLastRequest < session.requiredWait) {
                blacklist[ip] = true;
                delete sessions[id];
                await sendWebhookLog("🚫 **DETECT BOT**\n**IP:** `" + ip + "`");
                return res.status(getRandomError()).send("SECURITY : BANNED ACCESS!");
            }
            session.used = true;
        }
        
        // == INITIALIZATION (STEP 0) == \\
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
                keyCreatedAt: now, 
                requiredWait: waitTime, 
                used: false 
            };

            const firstStep = sequence[0];
            // GENERATE PATH ACAK UNTUK LAYER BERIKUTNYA
            const nextPath = Math.random().toString(36).substring(2, 10);
            const nextUrl = "https://" + host + "/api/" + nextPath + "?" + firstStep + "." + newSessionID + "." + nextKey;
            
            const luaScript = "task.wait(" + (waitTime / 1000) + ") loadstring(game:HttpGet(\"" + nextUrl + "\"))()";
            return res.status(200).send(luaScript);
        }

        // == LAYER ROTATION == \\
        if (sessions[id].currentIndex < SETTINGS.TOTAL_LAYERS - 1) {
            const session = sessions[id];
            session.currentIndex++; 
            
            const ipPart = ip.split('.').pop() || "0";
            const seed = parseInt(ipPart) + Math.floor(Math.random() * 10000);
            const newSessionID = seed.toString(36).substring(0, 4).padEnd(4, 'x');

            const nextStepNumber = session.stepSequence[session.currentIndex];
            const nextKey = Math.random().toString(36).substring(2, 8); 
            const waitTime = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;

            sessions[newSessionID] = { 
                ownerIP: session.ownerIP,
                stepSequence: session.stepSequence,
                currentIndex: session.currentIndex,
                nextKey: nextKey, 
                lastTime: now, 
                startTime: session.startTime, 
                keyCreatedAt: now, 
                requiredWait: waitTime, 
                used: false 
            };
            
            delete sessions[id]; 

            // GENERATE PATH ACAK UNTUK LAYER BERIKUTNYA
            const nextPath = Math.random().toString(36).substring(2, 10);
            const nextUrl = "https://" + host + "/api/" + nextPath + "?" + nextStepNumber + "." + newSessionID + "." + nextKey;
            
            const luaScript = "task.wait(" + (waitTime / 1000) + ") loadstring(game:HttpGet(\"" + nextUrl + "\"))()";
            return res.status(200).send(luaScript);
        }

        // == FINAL RESULT == \\
        if (sessions[id].currentIndex === SETTINGS.TOTAL_LAYERS - 1) {
            await sendWebhookLog("✅ **SUCCESS**\n**IP:** `" + ip + "` tembus " + SETTINGS.TOTAL_LAYERS + " layer.");
            delete sessions[id];
            return res.status(200).send(SETTINGS.REAL_SCRIPT.trim());
        }

    } catch (err) {
        return res.status(getRandomError()).send("SECURITY : BANNED ACCESS!");
    }
};
