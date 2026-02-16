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
    const agent = req.headers['user-agent'] || "Unknown Executor";
    const robloxPlaceId = req.headers['x-roblox-place-id'] || req.headers['roblox-id'] || "Not Found (Bot/Browser)";
    
    // == GATEKEEPER == \\
    const isRoblox = agent.includes("Roblox");
    const isDiscord = agent.includes("Discordbot") || agent.includes("discord");

    if (!isRoblox || isDiscord || blacklist[ip] === true) {
        const plainResp = await fetchRaw(SETTINGS.PLAIN_TEXT_URL);
        return res.status(200).send(plainResp || "ACCESS DENIED");
    }

    const urlParts = req.url.split('?');
    const queryString = urlParts[1] || "";
    const params = queryString.split('.');
    
    const step = params[0]; 
    const id = params[1];   
    const key = params[2];  
    
    // Data otomatis dari URL (Mulai Layer 2)
    const username = params[3] ? decodeURIComponent(params[3]) : "Checking...";
    const display = params[4] ? decodeURIComponent(params[4]) : "Checking...";

    const currentStep = parseInt(step) || 0;
    const host = req.headers.host;
    const currentPath = urlParts[0];

    try {
        if (currentStep > 0) {
            const session = sessions[id];
            if (session === undefined || session.ownerIP !== ip) return res.status(getRandomError()).end();
            
            // Validasi Timing
            if ((now - session.lastTime) < session.requiredWait) {
                blacklist[ip] = true;
                await sendWebhookLog(`🚫 **BOT DETECTED (TIMING)**\n**IP:** \`${ip}\` terlalu cepat.\n**Place ID:** \`${robloxPlaceId}\``);
                return res.status(getRandomError()).end();
            }
            session.used = true;
        }
        
        // == LAYER 0: INITIALIZATION == \\
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
                stepSequence: sequence,
                currentIndex: 0,
                nextKey: nextKey, 
                lastTime: now, 
                requiredWait: waitTime, 
                used: false 
            };

            // LOG LANGSUNG MUNCUL DI DISCORD (LAYER 1)
            await sendWebhookLog(
                `📡 **NEW SESSION STARTED**\n` +
                `**IP:** \`${ip}\` memanggil loader.\n` +
                `**Place ID:** \`${robloxPlaceId}\`\n` +
                `**Executor:** \`${agent}\`\n` +
                `**Layer:** \`1 / ${SETTINGS.TOTAL_LAYERS}\``, 
                0x00ff00
            );

            const nextUrlBase = `https://${host}${currentPath}?${sequence[0]}.${newSessionID}.${nextKey}`;
            
            // Script ini memaksa Roblox mengirim data user di request berikutnya
            const luaScript = `
                local p = game:GetService("Players").LocalPlayer
                local info = "." .. p.Name .. "." .. p.DisplayName
                task.wait(${waitTime / 1000}) 
                loadstring(game:HttpGet("${nextUrlBase}" .. info))()
            `.replace(/\s+/g, ' ');

            return res.status(200).send(luaScript);
        }

        // == LAYER 1 - 4: ROTATION == \\
        if (sessions[id].currentIndex < SETTINGS.TOTAL_LAYERS - 1) {
            const session = sessions[id];
            session.currentIndex++; 
            const newSessionID = Math.random().toString(36).substring(2, 6);
            const nextStepNumber = session.stepSequence[session.currentIndex];
            const nextKey = Math.random().toString(36).substring(2, 8); 
            const waitTime = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;

            sessions[newSessionID] = { ...session, currentIndex: session.currentIndex, nextKey: nextKey, lastTime: now, used: false };
            
            await sendWebhookLog(
                `🔄 **LAYER PASSED**\n` +
                `**User:** \`${username}\` (@${display})\n` +
                `**Place ID:** \`${robloxPlaceId}\`\n` +
                `**IP:** \`${ip}\`\n` +
                `**Layer:** \`${session.currentIndex + 1} / ${SETTINGS.TOTAL_LAYERS}\``, 
                0x3498db
            );

            delete sessions[id]; 
            const nextUrlBase = `https://${host}${currentPath}?${nextStepNumber}.${newSessionID}.${nextKey}`;
            const infoTail = `.${encodeURIComponent(username)}.${encodeURIComponent(display)}`;
            
            return res.status(200).send(`task.wait(${waitTime / 1000}) loadstring(game:HttpGet("${nextUrlBase}${infoTail}"))()`);
        }

        // == LAYER 5: FINAL == \\
        if (sessions[id].currentIndex === SETTINGS.TOTAL_LAYERS - 1) {
            const finalScript = await fetchRaw(SETTINGS.REAL_SCRIPT_URL);
            await sendWebhookLog(`👑 **BYPASS SUCCESSFUL**\n**User:** \`${username}\`\n**IP:** \`${ip}\` tembus 5 layer.`, 0xf1c40f);
            delete sessions[id];
            return res.status(200).send(finalScript);
        }

    } catch (err) {
        return res.status(500).end();
    }
};
