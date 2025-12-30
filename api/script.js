const https = require('https');

// ============================
// SETTINGS
// ============================
const SETTINGS = {
    WEBHOOK: "https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5",
    TOTAL_LAYERS: 3,
    MIN_WAIT: 112, 
    MAX_WAIT: 119, 
    SESSION_EXPIRY: 5000, // Dinaikkan ke 30 detik agar lebih stabil (mencegah timeout)
    KEY_LIFETIME: 5000,   // Dinaikkan ke 15 detik
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
//  HELPER FUNCTIONS
// ==========================================
function getWIBTime() {
    return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        dateStyle: 'medium',
        timeStyle: 'medium'
    }).format(new Date());
}

// FUNGSI ENKRIPSI XOR - Mengamankan script asli dari HttpSpy/Dumper
function xorEncrypt(text, key) {
    let encrypted = [];
    for (let i = 0; i < text.length; i++) {
        encrypted.push(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return JSON.stringify(encrypted);
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
    res.setHeader('Content-Type', 'text/plain');
    
    const now = Date.now();
    const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0] || "unknown";
    const agent = req.headers['user-agent'] || "";
    
    // == GATEKEEPER == \\
    const isRoblox = agent.includes("Roblox") || req.headers['roblox-id'];
    if (!isRoblox) return res.status(200).send(SETTINGS.PLAIN_TEXT_RESP);
    if (blacklist[ip] === true) return res.status(403).send("SECURITY : BANNED ACCESS!");

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
            if (!session) return res.status(403).send("SECURITY : SESSION NOT FOUND.");
            if (session.ownerIP !== ip) return res.status(403).send("SECURITY : IP MISMATCH.");
            
            const expectedStep = session.stepSequence[session.currentIndex];
            if (currentStep !== expectedStep) {
                delete sessions[id];
                return res.status(403).send("SECURITY : INVALID SEQUENCE.");
            }

            if (session.used === true) {
                blacklist[ip] = true;
                await sendWebhookLog(`🚫 **REPLAY ATTACK**\n**IP:** \`${ip}\``);
                return res.status(403).send("SECURITY : LINK EXPIRED.");
            }

            if (now - session.startTime > SETTINGS.SESSION_EXPIRY || now - session.keyCreatedAt > SETTINGS.KEY_LIFETIME) {
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
                await sendWebhookLog(`🚫 **DETECT BOT**\n**IP:** \`${ip}\` timing violation.`);
                return res.status(403).send("SECURITY : TIMING VIOLATION.");
            }
            session.used = true;
        }
        
        // == INITIALIZE (STEP 0) == \\
        if (currentStep === 0) {
            const seed = parseInt(ip.split('.').pop() || "0") + Math.floor(Math.random() * 10000);
            const newSessionID = seed.toString(36).substring(0, 4).padEnd(4, 'x');
            const nextKey = Math.random().toString(36).substring(2, 8);
            const waitTime = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;

            let sequence = [];
            while(sequence.length < SETTINGS.TOTAL_LAYERS) {
                let r = Math.floor(Math.random() * 300) + 1;
                if(!sequence.includes(r)) sequence.push(r);
            }

            sessions[newSessionID] = { 
                ownerIP: ip, stepSequence: sequence, currentIndex: 0, nextKey: nextKey, 
                lastTime: now, startTime: now, keyCreatedAt: now, requiredWait: waitTime, used: false 
            };

            const nextUrl = `https://${host}${currentPath}?${sequence[0]}.${newSessionID}.${nextKey}`;
            return res.status(200).send(`-- RAWR\ntask.wait(${waitTime / 1000})\nloadstring(game:HttpGet("${nextUrl}"))()`);
        }

        // == ROTASI GHOST ID (LAYER HANDSHAKE) == \\
        if (sessions[id].currentIndex < SETTINGS.TOTAL_LAYERS - 1) {
            const session = sessions[id];
            session.currentIndex++; 
            
            const newSessionID = Math.random().toString(36).substring(2, 6).padEnd(4, 'x');
            const nextStep = session.stepSequence[session.currentIndex];
            const nextKey = Math.random().toString(36).substring(2, 8); 
            const waitTime = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;

            sessions[newSessionID] = { ...session, currentIndex: session.currentIndex, nextKey: nextKey, lastTime: now, keyCreatedAt: now, used: false };
            delete sessions[id]; 

            const nextUrl = `https://${host}${currentPath}?${nextStep}.${newSessionID}.${nextKey}`;
            return res.status(200).send(`-- RAWR ${session.currentIndex + 1}\ntask.wait(${waitTime / 1000})\nloadstring(game:HttpGet("${nextUrl}"))()`);
        }

        // == FINAL: ENCRYPTED DELIVERY & ANTI-HOOK == \\
        if (sessions[id].currentIndex === SETTINGS.TOTAL_LAYERS - 1) {
            await sendWebhookLog(`✅ **SUCCESS**\n**IP:** \`${ip}\` tembus ${SETTINGS.TOTAL_LAYERS} layer.`);

            const xorKey = "Ndraawz_" + Math.random().toString(36).substring(2, 8);
            const encryptedPayload = xorEncrypt(SETTINGS.REAL_SCRIPT.trim(), xorKey);

            const finalLua = `
local _data = ${encryptedPayload}
local _key = "${xorKey}"

-- XOR Compatibility Layer (Support all executors)
local function bitXor(a, b)
    if bit32 and bit32.bxor then return bit32.bxor(a, b) end
    return a ^ b
end

-- Integrity Check
local function verify()
    local ls = tostring(loadstring)
    if not ls:find("builtin") and not ls:find("loadstring") then return false end
    if debug and debug.getinfo(loadstring).what ~= "C" then return false end
    return true
end

if not verify() then 
    game:GetService("Players").LocalPlayer:Kick("Security Detection: Hooking") 
    return 
end

-- Decryption Process
local _raw = ""
for i = 1, #_data do
    local kChar = string.byte(_key, (i - 1) % #_key + 1)
    local success, res = pcall(function() return string.char(bitXor(_data[i], kChar)) end)
    if success then _raw = _raw .. res end
end

-- Final Execution
local _exec = (getfenv().loadstring or loadstring)
if _exec and _raw then
    local f, err = _exec(_raw)
    if f then 
        _raw = nil
        f() 
    else 
        warn("Ndraawz Security Error: " .. tostring(err)) 
    end
end
            `.trim();

            delete sessions[id];
            return res.status(200).send(finalLua);
        }

    } catch (err) {
        return res.status(500).send("SECURITY : INTERNAL ERROR!");
    }
};
