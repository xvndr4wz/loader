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
    REAL_SCRIPT: `
        -- SCRIPT ASLI ANDA
        print("Ndraawz Security: Authorized Access!")
        local p = game.Players.LocalPlayer
        if p.Character and p.Character:FindFirstChild("Humanoid") then
            p.Character.Humanoid.Health -= 50
        end
    `
};

let sessions = {}; 
let blacklist = {}; 

// Auto Cleanup
setInterval(() => {
    const now = Date.now();
    for (const id in sessions) {
        if (now - sessions[id].startTime > SETTINGS.SESSION_EXPIRY + 2000) delete sessions[id];
    }
}, 30000);

async function sendWebhookLog(message) {
    const data = JSON.stringify({ 
        embeds: [{
            title: "❗️Ndraawz Security❗️",
            description: message,
            color: 0xff0000,
            footer: { text: "Ndraawz Security" }
        }]
    });
    const url = new URL(SETTINGS.WEBHOOK);
    const options = {
        hostname: url.hostname, path: url.pathname, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
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
    const accept = req.headers['accept'] || "";
    
    // == GATEKEEPER FIX (ANTI-403 EXECUTOR) == \\
    // 1. Cek apakah User-Agent mengandung 'Roblox'
    // 2. Cek apakah header 'accept' adalah '*/*' (Ciri khas HttpGet Roblox)
    // 3. Bot browser biasanya mengirim 'text/html' di header accept, kita blokir itu.
    const isRoblox = agent.includes("Roblox");
    const isBrowser = accept.includes("text/html") || accept.includes("application/xhtml+xml");

    if (!isRoblox || isBrowser) {
        // Jika bot browser mencoba akses, kasih 403
        return res.status(403).send(SETTINGS.PLAIN_TEXT_RESP);
    }

    if (blacklist[ip] === true) {
        return res.status(403).send("SECURITY : BANNED!");
    }

    // == PARSING URL == \\
    const urlParts = req.url.split('?');
    const queryString = urlParts[1] || "";
    const params = queryString.split('.');
    const step = params[0], id = params[1], key = params[2];
    const currentStep = parseInt(step) || 0;
    const host = req.headers.host;
    const currentPath = urlParts[0];

    try {
        if (currentStep > 0) {
            const session = sessions[id];
            if (!session || session.ownerIP !== ip) return res.status(403).send("SECURITY : INVALID SESSION.");
            
            if (currentStep !== session.stepSequence[session.currentIndex]) {
                delete sessions[id];
                return res.status(403).send("SECURITY : WRONG SEQUENCE.");
            }

            if (session.used) {
                blacklist[ip] = true;
                return res.status(403).send("SECURITY : REPLAY.");
            }

            if (session.nextKey !== key) {
                delete sessions[id];
                return res.status(403).send("SECURITY : WRONG KEY.");
            }

            if (now - session.lastTime < session.requiredWait) {
                blacklist[ip] = true;
                delete sessions[id];
                await sendWebhookLog("🚫 **TIMING VIOLATION**\nIP: `" + ip + "`");
                return res.status(403).send("SECURITY : TOO FAST.");
            }
            session.used = true;
        }
        
        if (currentStep === 0) {
            const newID = Math.random().toString(36).substring(2, 6);
            const nextKey = Math.random().toString(36).substring(2, 8);
            const waitTime = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;

            let sequence = [];
            while(sequence.length < SETTINGS.TOTAL_LAYERS) {
                let r = Math.floor(Math.random() * 300) + 1;
                if(!sequence.includes(r)) sequence.push(r);
            }

            sessions[newID] = { 
                ownerIP: ip, stepSequence: sequence, currentIndex: 0,
                nextKey: nextKey, lastTime: now, startTime: now, 
                requiredWait: waitTime, used: false 
            };

            const nextUrl = "https://" + host + currentPath + "?" + sequence[0] + "." + newID + "." + nextKey;
            return res.status(200).send(`-- RAWR\ntask.wait(${waitTime/1000})\nloadstring(game:HttpGet("${nextUrl}"))()`);
        }

        if (sessions[id].currentIndex < SETTINGS.TOTAL_LAYERS - 1) {
            const session = sessions[id];
            session.currentIndex++; 
            const newID = Math.random().toString(36).substring(2, 6);
            const nextStep = session.stepSequence[session.currentIndex];
            const nextKey = Math.random().toString(36).substring(2, 8); 
            const waitTime = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;

            sessions[newID] = { ...session, nextKey, lastTime: now, used: false };
            delete sessions[id]; 

            const nextUrl = "https://" + host + currentPath + "?" + nextStep + "." + newID + "." + nextKey;
            return res.status(200).send(`-- RAWR ${session.currentIndex + 1}\ntask.wait(${waitTime/1000})\nloadstring(game:HttpGet("${nextUrl}"))()`);
        }

        if (sessions[id].currentIndex === SETTINGS.TOTAL_LAYERS - 1) {
            await sendWebhookLog("✅ **SUCCESS**\nIP: `" + ip + "`");
            delete sessions[id];
            return res.status(200).send(SETTINGS.REAL_SCRIPT.trim());
        }

    } catch (err) { return res.status(500).send("ERROR"); }
};
