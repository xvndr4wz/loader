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
    PLAIN_TEXT_URL: "https://raw.githubusercontent.com/xvndr4wz/loader/refs/heads/main/api/uajja",
    REAL_SCRIPT_URL: "https://raw.githubusercontent.com/xvndr4wz/loader/refs/heads/main/SLFB.lua"
};

// ==========================================
// MEMORY STORAGE
// ==========================================
let sessions = {}; 
let blacklist = {}; 

function fetchRaw(url) {
    return new Promise((resolve) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => resolve(data.trim()));
        }).on('error', () => resolve(null));
    });
}

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

async function sendWebhookLog(message, color = 0xff0000) {
    const data = JSON.stringify({ 
        embeds: [{
            title: "❗️Ndraawz Security System❗️",
            description: message,
            color: color,
            footer: { text: "Security Monitor | " + getWIBTime() }
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

    return new Promise((resolve) => {
        const req = https.request(options, (res) => {
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
    
    // == STRICT GATEKEEPER == \\
    // 1. Cek apakah ini bot Discord (Kita blokir tanpa log agar tidak spam)
    if (agent.includes("Discordbot") || agent.includes("discord")) {
        const plainResp = await fetchRaw(SETTINGS.PLAIN_TEXT_URL);
        return res.status(getRandomError()).send(plainResp || "ACCESS DENIED");
    }

    // 2. Cek apakah ini Roblox asli (Wajib ada header Roblox atau Agent Roblox)
    const isRoblox = agent.includes("Roblox") && 
                     (req.headers['roblox-id'] || req.headers['x-roblox-place-id'] || agent.includes("RobloxApp"));

    // 3. Cek Blacklist
    if (!isRoblox || blacklist[ip] === true) {
        const plainResp = await fetchRaw(SETTINGS.PLAIN_TEXT_URL);
        return res.status(getRandomError()).send(plainResp || "ACCESS DENIED");
    }

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
        if (currentStep > 0) {
            const session = sessions[id];

            if (session === undefined || session.ownerIP !== ip) {
                return res.status(getRandomError()).send("SESSION_INVALID");
            }

            const expectedStep = session.stepSequence[session.currentIndex];
            if (currentStep !== expectedStep) {
                delete sessions[id];
                return res.status(getRandomError()).send("STEP_MISMATCH");
            }

            if (session.used === true) {
                blacklist[ip] = true;
                await sendWebhookLog(`🚫 **REPLAY DETECTED**\n**IP:** \`${ip}\` mencoba bypass layer yang sudah mati.`);
                return res.status(getRandomError()).send("LINK_EXPIRED");
            }

            // Validasi Timing
            const timeSinceLastRequest = now - session.lastTime;
            if (timeSinceLastRequest < session.requiredWait) {
                blacklist[ip] = true;
                delete sessions[id];
                await sendWebhookLog(`🚫 **BOT DETECTED (TIMING)**\n**IP:** \`${ip}\` terlalu cepat mendownload layer berikutnya.\n**Executor:** \`${agent}\``);
                return res.status(getRandomError()).send("BOT_DETECTED");
            }
            session.used = true;
        }
        
        // == INITIALIZATION (LAYER 0) == \\
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

            // Note: Tidak ada log di sini agar Discord kamu tidak spam "New Access"
            const nextUrl = `https://${host}${currentPath}?${sequence[0]}.${newSessionID}.${nextKey}`;
            return res.status(200).send(`task.wait(${waitTime / 1000}) loadstring(game:HttpGet("${nextUrl}"))()`);
        }

        // == LAYER PROGRESSION == \\
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
            const nextUrl = `https://${host}${currentPath}?${nextStepNumber}.${newSessionID}.${nextKey}`;
            return res.status(200).send(`task.wait(${waitTime / 1000}) loadstring(game:HttpGet("${nextUrl}"))()`);
        }

        // == FINAL SUCCESS (LOG KIRIM DI SINI) == \\
        if (sessions[id].currentIndex === SETTINGS.TOTAL_LAYERS - 1) {
            const finalScript = await fetchRaw(SETTINGS.REAL_SCRIPT_URL);
            if (finalScript) {
                await sendWebhookLog(`👑 **BYPASS SUCCESSFUL**\n**IP:** \`${ip}\` mendapatkan script utama!\n**Executor:** \`${agent}\`\n**Status:** Fully Authenticated.`, 0x00ff00);
                delete sessions[id];
                return res.status(200).send(finalScript);
            }
        }

    } catch (err) {
        return res.status(500).send("INTERNAL_ERROR");
    }
};
