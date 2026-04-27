const https = require('https');

// ============================
// SETTINGS
// ============================
const SETTINGS = {
    TOTAL_LAYERS: 5,
    MIN_WAIT: 112,
    MAX_WAIT: 119,
    SESSION_EXPIRY: 10000,
    KEY_LIFETIME: 5000,
    // URL SUMBER SCRIPT ASLI (dari rubis.app)
    REAL_SCRIPT_URL: "https://api.rubis.app/v2/scrap/bMUJDedIAAvDDdeW/raw"
};

// ==========================================
// MEMORY STORAGE
// ==========================================
let sessions = {};
let blacklist = {};

// ==========================================
// HELPER: FETCH DATA DARI URL
// ==========================================
function fetchRaw(url) {
    return new Promise((resolve) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => resolve(data));
        }).on('error', (err) => {
            console.error(`Fetch error: ${err.message}`);
            resolve(null);
        });
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
// MAIN HANDLER (ANTI-CURI 5 LAYER)
// ==========================================
module.exports = async function handler(req, res) {
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const now = Date.now();
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || "unknown";
    const agent = req.headers['user-agent'] || "";
    
    // ========== GATEKEEPER ==========
    const isRoblox = agent.includes("Roblox") && 
                     (req.headers['roblox-id'] || req.headers['x-roblox-place-id'] || agent.includes("RobloxApp"));
    const isDiscord = agent.includes("Discordbot");
    
    // Cek blacklist
    if (blacklist[ip] === true) {
        return res.status(403).send("ACCESS DENIED");
    }
    
    // Blokir non-Roblox
    if (!isRoblox || isDiscord) {
        return res.status(getRandomError()).send("ACCESS DENIED");
    }
    
    // ========== PARSING URL ==========
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
        // ========== VALIDASI SESSION (untuk step > 0) ==========
        if (currentStep > 0) {
            const session = sessions[id];
            
            if (!session || session.ownerIP !== ip) {
                return res.status(getRandomError()).send("ACCESS DENIED");
            }
            
            const expectedStep = session.stepSequence[session.currentIndex];
            if (currentStep !== expectedStep) {
                delete sessions[id];
                return res.status(getRandomError()).send("ACCESS DENIED");
            }
            
            if (session.used === true) {
                blacklist[ip] = true;
                delete sessions[id];
                return res.status(getRandomError()).send("ACCESS DENIED");
            }
            
            const sessionDuration = now - session.startTime;
            const keyDuration = now - session.keyCreatedAt;
            if (sessionDuration > SETTINGS.SESSION_EXPIRY || keyDuration > SETTINGS.KEY_LIFETIME) {
                delete sessions[id];
                return res.status(getRandomError()).send("ACCESS DENIED");
            }
            
            if (session.nextKey !== key) {
                delete sessions[id];
                return res.status(getRandomError()).send("ACCESS DENIED");
            }
            
            const timeSinceLastRequest = now - session.lastTime;
            if (timeSinceLastRequest < session.requiredWait) {
                blacklist[ip] = true;
                delete sessions[id];
                return res.status(getRandomError()).send("ACCESS DENIED");
            }
            
            session.used = true;
        }
        
        // ========== INISIALISASI SESSION BARU (step 0) ==========
        if (currentStep === 0) {
            const ipPart = ip.split('.').pop() || "0";
            const seed = parseInt(ipPart) + Math.floor(Math.random() * 10000);
            const newSessionID = seed.toString(36).substring(0, 4).padEnd(4, 'x');
            
            const nextKey = Math.random().toString(36).substring(2, 8);
            const waitTime = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;
            
            // Buat urutan step random 1-300 (5 angka unik)
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
            const nextUrl = `https://${host}${currentPath}?${firstStep}.${newSessionID}.${nextKey}`;
            
            // Script Lua yang dikirim ke client
            const luaScript = `task.wait(${(waitTime / 1000)}) loadstring(game:HttpGet("${nextUrl}"))()`;
            
            console.log(`[NEW SESSION] IP: ${ip} | ID: ${newSessionID} | Wait: ${waitTime}ms`);
            return res.status(200).send(luaScript);
        }
        
        // ========== ROTASI SESSION (middle layers) ==========
        if (sessions[id] && sessions[id].currentIndex < SETTINGS.TOTAL_LAYERS - 1) {
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
            const luaScript = `task.wait(${(waitTime / 1000)}) loadstring(game:HttpGet("${nextUrl}"))()`;
            
            console.log(`[ROTATION] IP: ${ip} | Old: ${id} | New: ${newSessionID} | Step: ${session.currentIndex + 1}/${SETTINGS.TOTAL_LAYERS}`);
            return res.status(200).send(luaScript);
        }
        
        // ========== LAYER TERAKHIR: KIRIM SCRIPT ASLI ==========
        if (sessions[id] && sessions[id].currentIndex === SETTINGS.TOTAL_LAYERS - 1) {
            console.log(`[SUCCESS] IP: ${ip} berhasil tembus ${SETTINGS.TOTAL_LAYERS} layer`);
            
            const finalScript = await fetchRaw(SETTINGS.REAL_SCRIPT_URL);
            if (finalScript) {
                delete sessions[id];
                return res.status(200).send(finalScript);
            } else {
                console.error(`[ERROR] Gagal fetch script dari: ${SETTINGS.REAL_SCRIPT_URL}`);
                return res.status(500).send("-- ERROR: SCRIPT TIDAK DAPAT DIAMBIL --");
            }
        }
        
        // Fallback
        return res.status(getRandomError()).send("ACCESS DENIED");
        
    } catch (err) {
        console.error(`[ERROR] ${err.message}`);
        return res.status(getRandomError()).send("ACCESS DENIED");
    }
};
