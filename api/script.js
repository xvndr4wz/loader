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
    PLAIN_TEXT_RESP: "kenaa?",
    AUTH_HEADER: "ndraawz-security-token", // == NAMA HEADER RAHASIA == \\
    REAL_SCRIPT: `
        -- SCRIPT ASLI ANDA
        print("Ndraawz Security: Header Proxy Full Stealth Active!")
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
    
    // == GATEKEEPER : VALIDASI AGENT == \\
    const isRoblox = agent.includes("Roblox") || req.headers['roblox-id'];
    if (!isRoblox) {
        return res.status(200).send(SETTINGS.PLAIN_TEXT_RESP);
    }

    if (blacklist[ip] === true) {
        return res.status(403).send("SECURITY : BANNED ACCESS!");
    }

    // == AMBIL DATA DARI PROXY HEADER (ANTISPY) == \\
    const authData = req.headers[SETTINGS.AUTH_HEADER] || "";
    const params = authData.split('.');
    
    const step = params[0]; 
    const id = params[1];   
    const key = params[2];  
    
    const currentStep = parseInt(step) || 0;
    const host = req.headers.host;
    const currentPath = req.url.split('?')[0]; // URL tetap bersih

    try {
        // == HANDSHAKE VALIDATION == \\
        if (currentStep > 0) {
            const session = sessions[id];

            if (session === undefined) {
                return res.status(403).send("SECURITY : SESSION NOT FOUND.");
            }

            if (session.ownerIP !== ip) {
                return res.status(403).send("SECURITY : IP MISMATCH.");
            }

            // == VALIDASI KEY & STEALTH FINGERPRINT == \\
            if (!key || !key.endsWith("24") || key.slice(0, -2) !== session.nextKey) {
                delete sessions[id];
                return res.status(403).send("SECURITY : HANDSHAKE ERROR.");
            }

            const expectedStep = session.stepSequence[session.currentIndex];
            if (currentStep !== expectedStep) {
                delete sessions[id];
                return res.status(403).send("SECURITY : INVALID SEQUENCE.");
            }

            if (session.used === true) {
                blacklist[ip] = true;
                await sendWebhookLog("🚫 **REPLAY ATTACK**\n**IP:** `" + ip + "` mencoba akses ulang link mati.");
                return res.status(403).send("SECURITY : LINK EXPIRED.");
            }

            if (now - session.startTime > SETTINGS.SESSION_EXPIRY) {
                delete sessions[id];
                return res.status(403).send("SECURITY : SESSION EXPIRED.");
            }

            // == NO TOLERANCE TIMING == \\
            const timeSinceLastRequest = now - session.lastTime;
            if (timeSinceLastRequest < session.requiredWait) {
                blacklist[ip] = true;
                delete sessions[id];
                await sendWebhookLog("🚫 **DETECT BOT**\n**IP:** `" + ip + "` timing violation (Header Proxy Mode).");
                return res.status(403).send("SECURITY : TIMING VIOLATION.");
            }
            session.used = true;
        }
        
        // == INISIALISASI / ROTASI == \\
        if (currentStep === 0 || (sessions[id] && sessions[id].currentIndex < SETTINGS.TOTAL_LAYERS - 1)) {
            let session;
            let idToUse;

            if (currentStep === 0) {
                // == ID 4 KARAKTER BERBASIS IP == \\
                const ipPart = ip.split('.').pop() || "0";
                const seed = parseInt(ipPart) + Math.floor(Math.random() * 10000);
                const newID = seed.toString(36).substring(0, 4).padEnd(4, 'x');

                let sequence = [];
                while(sequence.length < SETTINGS.TOTAL_LAYERS) {
                    let r = Math.floor(Math.random() * 300) + 1;
                    if(!sequence.includes(r)) sequence.push(r);
                }

                session = { 
                    ownerIP: ip, 
                    stepSequence: sequence,
                    currentIndex: 0,
                    startTime: now,
                    used: false 
                };
                sessions[newID] = session;
                idToUse = newID;
            } else {
                session = sessions[id];
                session.currentIndex++;
                idToUse = id;
            }

            session.nextKey = Math.random().toString(36).substring(2, 7);
            session.lastTime = now;
            session.requiredWait = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;

            const nextStepNum = session.stepSequence[session.currentIndex];
            const nextToken = `${nextStepNum}.${idToUse}.${session.nextKey}24`;

            // == LUA SCRIPT: URL BERSIH TOTAL DI HTTPSPY == \\
            const luaScript = `
-- Layer ${session.currentIndex + 1}
task.wait(${session.requiredWait / 1000})
local success, response = pcall(function()
    return game:HttpGetAsync("https://${host}${currentPath}", {
        ["${SETTINGS.AUTH_HEADER}"] = "${nextToken}"
    })
end)
if success then loadstring(response)() end
            `.trim();
            
            return res.status(200).send(luaScript);
        }

        // == FINAL KIRIM SCRIPT == \\
        if (sessions[id].currentIndex === SETTINGS.TOTAL_LAYERS - 1) {
            await sendWebhookLog("✅ **SUCCESS**\n**IP:** `" + ip + "` passed all layers (Header Proxy).");
            delete sessions[id];
            return res.status(200).send(SETTINGS.REAL_SCRIPT.trim());
        }

    } catch (err) {
        return res.status(500).send("SECURITY : INTERNAL ERROR!");
    }
};
