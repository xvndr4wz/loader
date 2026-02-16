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
    // LINK SUMBER DATA RAW
    PLAIN_TEXT_URL: "https://raw.githubusercontent.com/xvndr4wz/loader/refs/heads/main/api/uajja",
    REAL_SCRIPT_URL: "https://raw.githubusercontent.com/xvndr4wz/loader/refs/heads/main/SLFB.lua"
};

// ==========================================
// MEMORY STORAGE
// ==========================================
let sessions = {}; 
let blacklist = {}; 

// ==========================================
// HELPER: FETCH DARI GITHUB
// ==========================================
function fetchRaw(url) {
    return new Promise((resolve) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => resolve(data.trim()));
        }).on('error', () => resolve(null));
    });
}

// ==========================================
// FUNGSI UNTUK MENGHASILKAN ERROR ACAK
// ==========================================
function getRandomError() {
    const errorCodes = [400, 401, 403, 404, 500, 502, 503];
    return errorCodes[Math.floor(Math.random() * errorCodes.length)];
}

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
            res.on('data', function(chunk) {});
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
    
    // ==========================================
    // == ULTRA CANGGIH GATEKEEPER (ANTI-BYPASS) ==
    // ==========================================
    
    // 1. Cek User-Agent (Wajib Roblox)
    const isRobloxAgent = agent.includes("Roblox");

    // 2. Cek Header internal yang dikirim oleh core Roblox engine (Wajib ada)
    const hasRobloxHeaders = req.headers['x-roblox-place-id'] || req.headers['x-roblox-user-id'];

    // 3. Cek Header Cache & Encoding (Bot Discord sering melewatkan ini saat spoofing)
    const hasTechnicalHeaders = req.headers['accept-encoding'] && req.headers['accept'];

    // 4. Deteksi Khusus Bot (Discord sering menyisipkan identitas di belakang layar)
    const isBot = agent.includes("Discord") || agent.includes("bot") || agent.includes("python") || agent.includes("node-fetch");

    // LOGIKA FILTER:
    // Jika tidak ada header teknis Roblox, atau terdeteksi bot, berikan isi 'uajja'.
    if (!isRobloxAgent || !hasRobloxHeaders || !hasTechnicalHeaders || isBot || blacklist[ip] === true) {
        const plainResp = await fetchRaw(SETTINGS.PLAIN_TEXT_URL);
        return res.status(200).send(plainResp || "APA NYE?");
    }

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

    try {
        // == HANDSHAKE VALIDATION == \\
        if (currentStep > 0) {
            const session = sessions[id];

            if (session === undefined || session.ownerIP !== ip) {
                const plainResp = await fetchRaw(SETTINGS.PLAIN_TEXT_URL);
                return res.status(200).send(plainResp || "APA NYE?");
            }

            const expectedStep = session.stepSequence[session.currentIndex];
            if (currentStep !== expectedStep) {
                delete sessions[id];
                return res.status(getRandomError()).end();
            }

            if (session.used === true) {
                blacklist[ip] = true;
                await sendWebhookLog("🚫 **REPLAY ATTACK**\n**IP:** `" + ip + "`");
                return res.status(getRandomError()).end();
            }

            const sessionDuration = now - session.startTime;
            if (sessionDuration > SETTINGS.SESSION_EXPIRY) {
                delete sessions[id];
                return res.status(getRandomError()).end();
            }

            if (session.nextKey !== key) {
                delete sessions[id];
                return res.status(getRandomError()).end();
            }

            const timeSinceLastRequest = now - session.lastTime;
            if (timeSinceLastRequest < session.requiredWait) {
                blacklist[ip] = true;
                delete sessions[id];
                await sendWebhookLog("🚫 **DETECT BOT**\n**IP:** `" + ip + "` timing violation.");
                return res.status(getRandomError()).end();
            }
            session.used = true;
        }
        
        // == INISIALISASI SESI PERTAMA == \\
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
            const nextUrl = "https://" + host + currentPath + "?" + firstStep + "." + newSessionID + "." + nextKey;
            
            const luaScript = "task.wait(" + (waitTime / 1000) + ") loadstring(game:HttpGet(\"" + nextUrl + "\"))()";
            return res.status(200).send(luaScript);
        }

        // == ROTASI GHOST ID == \\
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

            const nextUrl = "https://" + host + currentPath + "?" + nextStepNumber + "." + newSessionID + "." + nextKey;
            const luaScript = "task.wait(" + (waitTime / 1000) + ") loadstring(game:HttpGet(\"" + nextUrl + "\"))()";

            return res.status(200).send(luaScript);
        }

        // == FINAL KIRIM SCRIPT == \\
        if (sessions[id].currentIndex === SETTINGS.TOTAL_LAYERS - 1) {
            const finalScript = await fetchRaw(SETTINGS.REAL_SCRIPT_URL);
            await sendWebhookLog("✅ **SUCCESS**\n**IP:** `" + ip + "` tembus " + SETTINGS.TOTAL_LAYERS + " layer.");
            delete sessions[id];
            return res.status(200).send(finalScript || "-- ERROR FETCH --");
        }

    } catch (err) {
        return res.status(getRandomError()).end();
    }
};
