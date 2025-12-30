const https = require('https');

// === SETTINGS === \\
const SETTINGS = {
    // Kunci rahasia yang disembunyikan di dalam Header (bukan di URL)
    HEADER_KEY: "ndraawz_secret_v1", 
    WEBHOOK: "https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5",
    TOTAL_LAYERS: 5,
    MIN_WAIT: 112, // Jeda minimal antar layer (ms)
    MAX_WAIT: 119, // Jeda maksimal antar layer (ms)
    SESSION_EXPIRY: 10000, // Sesi hangus dalam 10 detik
    PLAIN_TEXT_RESP: "pa?",
    REAL_SCRIPT: `print("Ndraawz Security: Header Injection Verified!")`
};

// === MEMORY SYSTEM === \\
let sessions = {};
let blacklist = {}; 

// === FUNGSI WAKTU WIB === \\
function getWIBTime() {
    return new Intl.DateTimeFormat('id-ID', { 
        timeZone: 'Asia/Jakarta', 
        dateStyle: 'medium', 
        timeStyle: 'medium' 
    }).format(new Date());
}

// === FUNGSI LOGGING DISCORD === \\
async function sendWebhookLog(msg) {
    const data = JSON.stringify({ 
        embeds: [{
            title: "❗️Ndraawz Security❗️",
            description: msg,
            color: 0x00ff00, // Warna hijau untuk sukses
            footer: { text: "WIB: " + getWIBTime() }
        }]
    });
    const url = new URL(SETTINGS.WEBHOOK);
    const req = https.request({ 
        hostname: url.hostname, 
        path: url.pathname, 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' } 
    });
    req.write(data);
    req.end();
}

// === FUNGSI GENERATE LAYER (INJECT KE HEADER) === \\
function generateNextLayer(host, currentPath, step, id, nextKey, nextWait) {
    const targetUrl = `https://${host}${currentPath}?step=${step}&id=${id}&key=${nextKey}`;
    
    // Di sini keajaibannya: Kunci dikirim lewat tabel header { ["X-Roblox-Edge-Token"] = ... }
    return `-- Layer ${step}
task.wait(${nextWait/1000})
local hs = game:GetService("HttpService")
local success, result = pcall(function()
    return hs:GetAsync("${targetUrl}", false, {
        ["X-Roblox-Edge-Token"] = "${SETTINGS.HEADER_KEY}",
        ["User-Agent"] = "Roblox/WinInet" -- Menyamar sebagai traffic asli Roblox
    })
end)
if success then loadstring(result)() else warn("Security Error: Connection Denied") end`;
}

// === MAIN HANDLER === \\
module.exports = async (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    const now = Date.now();
    const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0] || "unknown";
    
    // == TANGKAP KUNCI DARI HEADER == \\
    const incomingToken = req.headers['x-roblox-edge-token'];
    const { step, id, key } = req.query;
    const currentStep = parseInt(step) || 0;

    // == PROTEKSI 1: CEK APAKAH KUNCI HEADER ADA == \\
    // (Jika orang buka link via browser/fetch manual, bagian ini akan menolak mereka)
    if (currentStep > 0 && incomingToken !== SETTINGS.HEADER_KEY) {
        blacklist[ip] = true;
        await sendWebhookLog(`🚨 **MISSING HEADER TOKEN**\n**IP:** \`${ip}\` mencoba akses langsung via URL.`);
        return res.status(403).send("SECURITY : ACCESS DENIED.");
    }

    // == PROTEKSI 2: CEK BLACKLIST == \\
    if (blacklist[ip]) return res.status(403).send("SECURITY : BANNED.");

    try {
        // == PROTEKSI 3: VALIDASI SESI & TIMING == \\
        if (currentStep > 0) {
            const session = sessions[ip];
            if (!session || now - session.startTime > SETTINGS.SESSION_EXPIRY || session.id !== id || session.nextKey !== key) {
                return res.status(403).send("SECURITY : SESSION INVALID.");
            }
            // Anti-Speed (mencegah bypass antar layer)
            if (now - session.lastTime < session.requiredWait) {
                blacklist[ip] = true;
                return res.status(403).send("SECURITY : TIMING VIOLATION.");
            }
        }

        // == STEP 0: MULAI HANDSHAKE == \\
        if (currentStep === 0) {
            const sID = Math.random().toString(36).substring(2, 12);
            const nK = Math.random().toString(36).substring(2, 8);
            const wait = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;
            
            sessions[ip] = { id: sID, nextKey: nK, lastTime: now, startTime: now, requiredWait: wait };
            
            return res.status(200).send(generateNextLayer(req.headers.host, req.url.split('?')[0], 1, sID, nK, wait));
        }

        // == PROSES LAYER TENGAH (1 SAMPAI 4) == \\
        if (currentStep < SETTINGS.TOTAL_LAYERS) {
            const nK = Math.random().toString(36).substring(2, 8);
            const wait = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;
            
            sessions[ip].nextKey = nK;
            sessions[ip].lastTime = now;
            
            return res.status(200).send(generateNextLayer(req.headers.host, req.url.split('?')[0], currentStep + 1, id, nK, wait));
        }

        // == FINAL STEP: KIRIM SCRIPT ASLI == \\
        if (currentStep === SETTINGS.TOTAL_LAYERS) {
            await sendWebhookLog(`✅ **SUCCESS EXECUTE**\n**IP:** \`${ip}\` berhasil melewati semua layer.`);
            delete sessions[ip];
            return res.status(200).send(SETTINGS.REAL_SCRIPT);
        }
        
    } catch (e) { 
        return res.status(500).send("INTERNAL ERROR"); 
    }
};
