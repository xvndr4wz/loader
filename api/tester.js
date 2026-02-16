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
    return [400, 401, 403, 404, 500][Math.floor(Math.random() * 5)];
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
            title: "🛡️ NDRAAWZ AUTO-MONITOR 🛡️",
            description: message,
            color: color,
            footer: { text: "Security System | " + getWIBTime() }
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
    
    // Gatekeeper Dasar
    const isRoblox = agent.includes("Roblox");
    if (!isRoblox || agent.includes("Discord") || blacklist[ip] === true) {
        const plainResp = await fetchRaw(SETTINGS.PLAIN_TEXT_URL);
        return res.status(200).send(plainResp || "BANNED");
    }

    const urlParts = req.url.split('?');
    const query = urlParts[1] || "";
    const params = query.split('.');
    const step = params[0]; 
    const id = params[1];   
    const key = params[2];  
    const currentStep = parseInt(step) || 0;

    try {
        // == HANDSHAKE VALIDATION == \\
        if (currentStep > 0) {
            const session = sessions[id];
            if (!session || session.ownerIP !== ip) return res.status(getRandomError()).end();
            if (session.used) { blacklist[ip] = true; return res.status(getRandomError()).end(); }
            
            // Tangkap info user jika dikirim di layer berikutnya
            if (params[3]) session.username = decodeURIComponent(params[3]);
            if (params[4]) session.display = decodeURIComponent(params[4]);

            session.used = true;
        }

        // == LAYER 0 (AWAL) == \\
        if (currentStep === 0) {
            const newSessionID = Math.random().toString(36).substring(2, 6);
            const nextKey = Math.random().toString(36).substring(2, 8);
            const waitTime = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;

            let sequence = [];
            while(sequence.length < SETTINGS.TOTAL_LAYERS) {
                let r = Math.floor(Math.random() * 300) + 1;
                if(!sequence.includes(r)) sequence.push(r);
            }

            sessions[newSessionID] = { 
                ownerIP: ip, 
                username: "Detecting...", 
                stepSequence: sequence,
                currentIndex: 0,
                nextKey: nextKey, 
                lastTime: now, 
                startTime: now, 
                requiredWait: waitTime, 
                used: false 
            };

            const nextStep = sequence[0];
            const host = req.headers.host;
            const currentPath = urlParts[0];

            // DISINI TRIKNYA: Kita suruh Roblox ngirim Nama Player di request selanjutnya
            const nextUrl = `https://${host}${currentPath}?${nextStep}.${newSessionID}.${nextKey}`;
            const luaScript = `
                local p = game:GetService("Players").LocalPlayer
                local url = "${nextUrl}." .. p.Name .. "." .. p.DisplayName
                task.wait(${waitTime / 1000})
                loadstring(game:HttpGet(url))()
            `.replace(/\s+/g, ' ');

            return res.status(200).send(luaScript);
        }

        // == LAYER ROTATION (TENGAH) == \\
        if (sessions[id].currentIndex < SETTINGS.TOTAL_LAYERS - 1) {
            const session = sessions[id];
            session.currentIndex++;
            const newSessionID = Math.random().toString(36).substring(2, 6);
            const nextStepNum = session.stepSequence[session.currentIndex];
            const nextKey = Math.random().toString(36).substring(2, 8);
            const waitTime = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;

            sessions[newSessionID] = { ...session, currentIndex: session.currentIndex, nextKey: nextKey, lastTime: now, used: false };
            
            // Kirim Log di setiap perpindahan layer
            if (session.username !== "Detecting...") {
                await sendWebhookLog(
                    `🔄 **PLAYER MOVING LAYER**\n` +
                    `**User:** \`${session.username}\` (@${session.display})\n` +
                    `**Layer:** \`${session.currentIndex + 1} / ${SETTINGS.TOTAL_LAYERS}\`\n` +
                    `**IP:** \`${ip}\`\n` +
                    `**Place ID:** \`${req.headers['x-roblox-place-id'] || 'Private'}\``, 
                    0x3498db
                );
            }

            delete sessions[id];
            const nextUrl = `https://${req.headers.host}${urlParts[0]}?${nextStepNum}.${newSessionID}.${nextKey}`;
            return res.status(200).send(`task.wait(${waitTime / 1000}) loadstring(game:HttpGet("${nextUrl}"))()`);
        }

        // == FINAL SCRIPT == \\
        if (sessions[id].currentIndex === SETTINGS.TOTAL_LAYERS - 1) {
            const finalScript = await fetchRaw(SETTINGS.REAL_SCRIPT_URL);
            await sendWebhookLog(`👑 **BYPASS SUCCESSFUL**\n**User:** \`${sessions[id].username}\`\n**IP:** \`${ip}\` tembus total layer.`, 0xf1c40f);
            delete sessions[id];
            return res.status(200).send(finalScript);
        }

    } catch (err) {
        return res.status(500).end();
    }
};
