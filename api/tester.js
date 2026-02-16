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
    PLAIN_TEXT_URL: "https://raw.githubusercontent.com/xvndr4wz/loader/refs/heads/main/api/uajja",
    REAL_SCRIPT_URL: "https://raw.githubusercontent.com/xvndr4wz/loader/refs/heads/main/SLFB.lua"
};

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

async function sendWebhookLog(message, color = 0xff0000) {
    const data = JSON.stringify({ 
        embeds: [{
            title: "🛡️ Ndraawz Security 🛡️",
            description: message,
            color: color,
            footer: { text: "Security System Active" }
        }]
    });
    const url = new URL(SETTINGS.WEBHOOK);
    const options = { hostname: url.hostname, path: url.pathname, method: 'POST', headers: { 'Content-Type': 'application/json' } };
    const req = https.request(options);
    req.write(data);
    req.end();
}

// ==========================================
// MAIN HANDLER
// ==========================================
module.exports = async function(req, res) {
    const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0] || "unknown";
    const agent = req.headers['user-agent'] || "";
    
    // === 🛡️ HARD FILTER: HANYA ROBLOX ASLI YANG BOLEH LEWAT 🛡️ ===
    // Bot Discord atau Browser tidak akan punya header 'x-roblox-place-id'
    const isRoblox = agent.includes("Roblox") && (req.headers['x-roblox-place-id'] || req.headers['roblox-id']);

    if (!isRoblox) {
        // Jika bot discord/scraper akses, kita kasih error 403 (Forbidden)
        // Dan kita kirim teks sampah, bukan script bypass
        res.setHeader('Content-Type', 'text/plain');
        return res.status(403).send("HTTP 403: Access Denied. This resource is only accessible via Roblox Game Engine.");
    }

    // === JIKA LOLOS FILTER (ROBLOX ASLI) ===
    const now = Date.now();
    const urlParts = req.url.split('?');
    const params = (urlParts[1] || "").split('.');
    const currentStep = parseInt(params[0]) || 0;
    const id = params[1];
    const key = params[2];

    try {
        // Handshake Validation
        if (currentStep > 0) {
            const session = sessions[id];
            if (!session || session.ownerIP !== ip || session.nextKey !== key) {
                return res.status(403).end();
            }
            if ((now - session.lastTime) < session.requiredWait) {
                blacklist[ip] = true;
                await sendWebhookLog(`🚫 **BOT DETECTED**\nIP: \`${ip}\` mencoba bypass terlalu cepat.`);
                return res.status(403).end();
            }
        }
        
        // Initial Step (Layer 0)
        if (currentStep === 0) {
            const newID = Math.random().toString(36).substring(2, 6);
            const nextKey = Math.random().toString(36).substring(2, 8);
            const waitTime = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;

            let sequence = [];
            while(sequence.length < SETTINGS.TOTAL_LAYERS) {
                let r = Math.floor(Math.random() * 300) + 1;
                if(!sequence.includes(r)) sequence.push(r);
            }

            sessions[newID] = { ownerIP: ip, stepSequence: sequence, currentIndex: 0, nextKey: nextKey, lastTime: now, requiredWait: waitTime };

            const nextUrl = `https://${req.headers.host}${urlParts[0]}?${sequence[0]}.${newID}.${nextKey}`;
            res.setHeader('Content-Type', 'text/plain');
            return res.status(200).send(`task.wait(${waitTime / 1000}) loadstring(game:HttpGet("${nextUrl}"))()`);
        }

        // Layer Progression
        if (sessions[id].currentIndex < SETTINGS.TOTAL_LAYERS - 1) {
            const session = sessions[id];
            session.currentIndex++;
            const newID = Math.random().toString(36).substring(2, 6);
            const nextKey = Math.random().toString(36).substring(2, 8);
            const nextStepNum = session.stepSequence[session.currentIndex];
            
            sessions[newID] = { ...session, nextKey: nextKey, lastTime: now };
            delete sessions[id];

            const nextUrl = `https://${req.headers.host}${urlParts[0]}?${nextStepNum}.${newID}.${nextKey}`;
            return res.status(200).send(`task.wait(${session.requiredWait / 1000}) loadstring(game:HttpGet("${nextUrl}"))()`);
        }

        // Final Result
        if (sessions[id].currentIndex === SETTINGS.TOTAL_LAYERS - 1) {
            const finalScript = await fetchRaw(SETTINGS.REAL_SCRIPT_URL);
            await sendWebhookLog(`👑 **SUCCESS**\nIP \`${ip}\` tembus 5 Layer.`, 0x00ff00);
            delete sessions[id];
            return res.status(200).send(finalScript);
        }

    } catch (err) {
        return res.status(500).end();
    }
};
