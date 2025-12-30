const https = require('https');

// ============================
// SETTINGS / KONFIGURASI
// ============================
const SETTINGS = {
    // Ganti dengan URL Webhook Discord Anda
    WEBHOOK: "https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5",
    TOTAL_LAYERS: 5,        // Jumlah layer RAWR (0 sampai 4)
    MIN_WAIT: 112,          // Waktu tunggu minimal (ms)
    MAX_WAIT: 119,          // Waktu tunggu maksimal (ms)
    SESSION_EXPIRY: 30000,  // Masa berlaku sesi (30 detik)
    PLAIN_TEXT_RESP: "kena?",
    // MASUKKAN SCRIPT ASLI ANDA DI SINI
    REAL_SCRIPT: `
        print("Ndraawz Security: Script Berhasil Dijalankan!")
        local p = game.Players.LocalPlayer
        if p.Character and p.Character:FindFirstChild("Humanoid") then
            print("Halo " .. p.Name .. ", script ini aman dari dumper!")
            p.Character.Humanoid.Jump = true
        end
    `
};

// ============================
// MEMORY STORAGE
// ============================
let sessions = {}; 
let blacklist = {}; 

// ============================
// HELPER FUNCTIONS
// ============================
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
            footer: { text: "Ndraawz Security | " + getWIBTime() }
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

// ============================
// MAIN EXPORT (VERCEL / NODE.JS)
// ============================
module.exports = async function(req, res) {
    res.setHeader('Content-Type', 'text/plain');
    
    const now = Date.now();
    const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0] || "unknown";
    const agent = req.headers['user-agent'] || "";
    const host = req.headers.host;
    const currentPath = req.url.split('?')[0];
    
    // 1. GATEKEEPER: Hanya izinkan akses dari Roblox
    if (!agent.includes("Roblox")) {
        return res.status(200).send(SETTINGS.PLAIN_TEXT_RESP);
    }

    // 2. BLACKLIST CHECK
    if (blacklist[ip]) {
        return res.status(403).send("ACCESS DENIED");
    }

    // 3. ENDPOINT JEBAKAN (Honeypot)
    // Jika dumper mencoba mendownload URL ini, berikan isi zonk
    if (req.url.includes("verify_auth.lua")) {
        return res.status(200).send("-- HAI\n-- Nice try, but the script is not here!");
    }

    // 4. PARSING PARAMETERS (Format: ?step.id.key)
    const urlParts = req.url.split('?');
    const params = (urlParts[1] || "").split('.');
    
    const step = parseInt(params[0]) || 0;
    const id = params[1];
    const key = params[2];

    try {
        // == LOGIKA VALIDASI SESI (STEP > 0) == \\
        if (step > 0) {
            const session = sessions[id];
            if (!session) return res.status(403).send("INVALID SESSION");
            if (session.ownerIP !== ip) return res.status(403).send("IP MISMATCH");
            
            // Replay Attack Protection
            if (session.used) {
                return res.status(200).send("-- HAI"); 
            }

            // Handshake Key Check
            if (session.nextKey !== key) return res.status(403).send("KEY MISMATCH");

            // Timing Check (Anti-Bot)
            if (now - session.lastTime < session.requiredWait) {
                blacklist[ip] = true;
                await sendWebhookLog(`🚫 **BOT DETECTED**\nIP: \`${ip}\` melanggar batas waktu.`);
                return res.status(403).send("TOO FAST");
            }
            session.used = true;
        }

        // == LOGIKA LAYER RAWR (STEP 0 s/d 3) == \\
        if (step < SETTINGS.TOTAL_LAYERS - 1) {
            const newID = Math.random().toString(36).substring(2, 6);
            const nextKey = Math.random().toString(36).substring(2, 8);
            const nextStep = step + 1;
            const waitTime = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;

            sessions[newID] = { 
                ownerIP: ip, 
                nextKey: nextKey, 
                lastTime: now, 
                requiredWait: waitTime,
                used: false 
            };

            // Hapus sesi lama agar Ghost ID bekerja
            if (id) delete sessions[id];

            const nextUrl = `https://${host}${currentPath}?${nextStep}.${newID}.${nextKey}`;
            return res.status(200).send(`-- RAWR ${nextStep}\ntask.wait(${waitTime/1000})\nloadstring(game:HttpGet("${nextUrl}"))()`);
        }

        // == FINAL LAYER (STEP 4): JEBAKAN BATMAN == \\
        if (step === SETTINGS.TOTAL_LAYERS - 1) {
            await sendWebhookLog(`✅ **SUCCESS**\nIP: \`${ip}\` tembus sampai akhir.`);

            const scriptAsli = SETTINGS.REAL_SCRIPT.trim();
            const fakeUrl = `https://${host}${currentPath}/verify_auth.lua?id=${id}`;

            // Script yang dikirim ke Roblox (Wrapper Pelindung)
            const finalWrapper = `
--[[ 
    Ndraawz Security v4.0 
    Initializing secure environment...
]]

-- JEBAKAN: Dumper akan mencatat HttpGet ini dan menyimpan hasilnya (-- HAI)
task.spawn(function()
    pcall(function() 
        game:HttpGet("${fakeUrl}") 
    end)
end)

-- REAL SCRIPT: Disembunyikan di dalam variabel lokal agar dumper tidak menangkapnya sebagai hasil HttpGet utama
local _0xPayload = [=[${scriptAsli}]=]

-- Eksekusi tanpa meninggalkan jejak di HttpGet log
local _0xRun = loadstring(_0xPayload)
_0xPayload = nil -- Segera hapus dari memori
_0xRun()
            `.trim();

            delete sessions[id];
            return res.status(200).send(finalWrapper);
        }

    } catch (err) {
        console.error(err);
        return res.status(500).send("INTERNAL SERVER ERROR");
    }
};
