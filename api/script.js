const https = require('https');
const crypto = require('crypto');

// ============================
// SETTINGS (HARDCODED VERSION)
// ============================
const SETTINGS = {
    // Webhook langsung hardcoded (GANTI INI!)
    WEBHOOK: "https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5",
    
    // Master key hardcoded (GANTI INI DENGAN HASIL GENERATE!)
    // Generate dengan: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    MASTER_KEY: "3c7f2a8e9d4b1f6a5e8c3d7b2f9a4e1c6b8d5f2a7e9c4b1d6f3a8e5c2b7d4f1a9",
    
    TOTAL_LAYERS: 5,
    MIN_WAIT: 112,
    MAX_WAIT: 119,
    SESSION_EXPIRY: 10000,
    KEY_LIFETIME: 5000,
    PLAIN_TEXT_RESP: "apalo",
    
    // Script asli yang mau di-protect
    ORIGINAL_SCRIPT: `
-- SCRIPT ASLI ANDA (Protected by Ndraawz Security)
print("Ndraawz Security: Script Loaded Successfully!")
local player = game.Players.LocalPlayer

if player.Character and player.Character:FindFirstChild("Humanoid") then
    player.Character.Humanoid.Health = player.Character.Humanoid.Health - 50
    print("Health reduced by 50!")
end

-- Tambahkan logic game lu di sini
warn("Script ini di-protect oleh multi-layer encryption!")
    `.trim()
};

// ==========================================
// ENKRIPSI FUNCTIONS
// ==========================================
function encryptScript(text, sessionKey) {
    try {
        const iv = crypto.randomBytes(16);
        
        // Gabungkan master key dengan session key
        const combinedKey = crypto.createHash('sha256')
            .update(SETTINGS.MASTER_KEY + sessionKey)
            .digest();
        
        const cipher = crypto.createCipheriv('aes-256-cbc', combinedKey, iv);
        
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        return iv.toString('hex') + ':' + encrypted;
    } catch (err) {
        console.error('Encryption error:', err);
        return null;
    }
}

function generateDecryptionCode(sessionKey) {
    return `
-- Decryption Key (Unique per session)
local _k="${sessionKey}"
local _m="${SETTINGS.MASTER_KEY}"

-- Obfuscated decryption function
local function _x(e,k,m)
    local function _b(h)
        local r={}
        for i=1,#h,2 do 
            table.insert(r,tonumber(h:sub(i,i+1),16))
        end 
        return r 
    end
    
    local function _h(s)
        local b=0
        for i=1,#s do
            b=bit32.bxor(b,string.byte(s,i))
            b=bit32.lrotate(b,1)
        end
        return string.format("%08x",b):rep(8):sub(1,64)
    end
    
    local function _c(d,k)
        local iv={}
        local key={}
        local h=_h(m..k)
        
        for i=1,16 do iv[i]=d[i] end
        for i=1,32 do key[i]=tonumber(h:sub(i*2-1,i*2),16) end
        
        local out={}
        local prev=iv
        
        for i=17,#d,16 do
            local block={}
            for j=0,15 do
                if d[i+j] then
                    block[j+1]=bit32.bxor(d[i+j],key[(j%32)+1])
                    block[j+1]=bit32.bxor(block[j+1],prev[(j%16)+1])
                end
            end
            for _,v in ipairs(block) do 
                table.insert(out,v) 
                table.insert(prev,v)
                if #prev>16 then table.remove(prev,1) end
            end
        end
        
        return string.char(table.unpack(out))
    end
    
    local p={}
    for part in e:gmatch("[^:]+") do 
        table.insert(p,part) 
    end
    
    if #p~=2 then return nil end
    
    local raw=_b(p[1]..p[2])
    return _c(raw,k)
end

return _x
`.trim();
}

// ==========================================
// MEMORY STORAGE
// ==========================================
let sessions = {}; 
let blacklist = {}; 

// ==========================================
// WEBHOOK FUNCTIONS
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
            title: "❗️Ndraawz Security v2❗️",
            description: message,
            color: 0xff0000,
            footer: { text: "Ndraawz Security (Encrypted) | WIB: " + getWIBTime() }
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
            res.on('data', function() {});
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
    
    const isRoblox = agent.includes("Roblox") || req.headers['roblox-id'];
    if (!isRoblox) {
        return res.status(200).send(SETTINGS.PLAIN_TEXT_RESP);
    }

    if (blacklist[ip] === true) {
        return res.status(403).send("SECURITY : BANNED ACCESS!");
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

            if (session === undefined) {
                return res.status(403).send("SECURITY : SESSION NOT FOUND.");
            }

            if (session.ownerIP !== ip) {
                return res.status(403).send("SECURITY : IP MISMATCH.");
            }

            const expectedStep = session.stepSequence[session.currentIndex];
            if (currentStep !== expectedStep) {
                delete sessions[id];
                return res.status(403).send("SECURITY : INVALID SEQUENCE.");
            }

            if (session.used === true) {
                blacklist[ip] = true;
                await sendWebhookLog("🚫 **REPLAY ATTACK**\n**IP:** `" + ip + "` mencoba akses ulang link mati.");
                return res.status(403).send("SECURITY : LINK EXPIRED (OTP).");
            }

            const sessionDuration = now - session.startTime;
            const keyDuration = now - session.keyCreatedAt;
            if (sessionDuration > SETTINGS.SESSION_EXPIRY || keyDuration > SETTINGS.KEY_LIFETIME) {
                delete sessions[id];
                return res.status(403).send("SECURITY : SESSION/KEY EXPIRED.");
            }

            if (session.nextKey !== key) {
                delete sessions[id];
                return res.status(403).send("SECURITY : HANDSHAKE ERROR.");
            }

            const timeSinceLastRequest = now - session.lastTime;
            if (timeSinceLastRequest < session.requiredWait) {
                blacklist[ip] = true;
                delete sessions[id];
                await sendWebhookLog("🚫 **DETECT BOT**\n**IP:** `" + ip + "` timing violation (No Tolerance).");
                return res.status(403).send("SECURITY : TIMING VIOLATION.");
            }
            session.used = true;
        }
        
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
            const luaScript = "-- RAWR\ntask.wait(" + (waitTime / 1000) + ")\nloadstring(game:HttpGet(\"" + nextUrl + "\"))()";
            
            return res.status(200).send(luaScript);
        }

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
            const luaScript = "-- RAWR " + (session.currentIndex + 1) + "\ntask.wait(" + (waitTime / 1000) + ")\nloadstring(game:HttpGet(\"" + nextUrl + "\"))()";

            return res.status(200).send(luaScript);
        }

        if (sessions[id].currentIndex === SETTINGS.TOTAL_LAYERS - 1) {
            const sessionKey = crypto.randomBytes(16).toString('hex');
            const encryptedPayload = encryptScript(SETTINGS.ORIGINAL_SCRIPT, sessionKey);
            
            if (!encryptedPayload) {
                return res.status(500).send("SECURITY : ENCRYPTION ERROR!");
            }
            
            const decryptorCode = generateDecryptionCode(sessionKey);
            
            const antiHookLoader = `
-- Ndraawz Anti-Hook Loader v2
-- Protected by AES-256 Encryption

${decryptorCode}

-- Encrypted Payload (Unique per session)
local _e="${encryptedPayload}"

-- Execute immediately without exposing to loadstring hooks
local _s,_r=pcall(function()
    local _d=_x(_e,_k,_m)
    if not _d then 
        error("Decryption failed")
        return 
    end
    
    local _env=setmetatable({},{__index=getfenv()})
    local _fn=load(_d,"=ProtectedScript","t",_env)
    
    if _fn then 
        _fn()
    else
        error("Compilation failed")
    end
end)

if not _s then 
    warn("⚠️ Security: Execution failed - " .. tostring(_r))
end

_k,_m,_e,_x=nil,nil,nil,nil
`.trim();

            await sendWebhookLog("✅ **SUCCESS (ENCRYPTED)**\n**IP:** `" + ip + "` berhasil melewati " + SETTINGS.TOTAL_LAYERS + " layer + AES-256 encryption.");
            
            delete sessions[id];
            return res.status(200).send(antiHookLoader);
        }

    } catch (err) {
        console.error('Server error:', err);
        return res.status(500).send("SECURITY : INTERNAL ERROR!");
    }
};
