const https = require('https');
const crypto = require('crypto');

// SETTINGS
const SETTINGS = {
    SECRET_SALT: "NDRAAWZAJA",
    WEBHOOK: "https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5",
    TOTAL_LAYERS: 5,
    MIN_WAIT: 50, // Minimal nunggu 250ms
    MAX_WAIT: 100, // Maksimal nunggu 700ms
    PLAIN_TEXT_RESP: "https://ndraawzz-developer.vercel.app/api/script",
    REAL_SCRIPT: `
        -- SCRIPT ASLI LO DI SINI
        print("ZiFi Security: Script Verified and Loaded!")
        local p = game.Players.LocalPlayer
        if p.Character and p.Character:FindFirstChild("Humanoid") then
            p.Character.Humanoid.Health -= 50
        end
    `
};

// FUNCTION ALL
let sessions = {};
let blacklist = {}; 

async function sendToDiscord(msg) {
    const data = JSON.stringify({ 
        embeds: [{
            title: "🛡️ DARK VERSE SECURITY",
            description: msg,
            color: 0xff0000,
            footer: { text: "System Logs | " + new Date().toLocaleString() }
        }]
    });
    const url = new URL(SETTINGS.WEBHOOK);
    return new Promise((resolve) => {
        const req = https.request({
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, (res) => resolve(true));
        req.on('error', () => resolve(false));
        req.write(data);
        req.end();
    });
}

module.exports = async (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    const now = Date.now();
    const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0] || "unknown";
    const agent = req.headers['user-agent'] || "";
    
    // 1. FINGERPRINTING
    const isRoblox = agent.includes("Roblox") || req.headers['x-roblox-test-group'] || req.headers['roblox-id'];
    if (!isRoblox) return res.status(200).send(SETTINGS.PLAIN_TEXT_RESP);

    // 2. BLACKLIST CHECK
    if (blacklist[ip]) return res.status(403).send("SECURITY : BANNED ACCES!");

    try {
        const { step, id, key } = req.query;
        const currentStep = parseInt(step) || 0;
        const host = req.headers.host;
        const currentPath = req.url.split('?')[0];

        // 3. VALIDASI HANDSHAKE & TEMPO
        if (currentStep > 0) {
            const session = sessions[ip];
            
            if (!session || session.id !== id || session.nextKey !== key) {
                return res.status(200).send("SECURITY : HANDSHAKE ERROR.");
            }

            const timeDiff = now - session.lastTime;
            if (timeDiff < session.requiredWait) {
                blacklist[ip] = true;
                await sendToDiscord(`🚫 **BOT/SCANNER DETECTED**\n**IP:** \`${ip}\`\n**Violation:** Timing too fast.\n**Diff:** ${timeDiff}ms | **Min:** ${session.requiredWait}ms`);
                return res.status(403).send("warn('Zifi: Connection Terminated')");
            }
        }

        if (currentStep === 0) {
            const sessionID = Math.random().toString(36).substring(2, 12);
            const firstKey = Math.random().toString(36).substring(2, 8);
            const nextWait = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;

            sessions[ip] = { 
                id: sessionID, 
                nextKey: firstKey, 
                lastTime: now,
                requiredWait: nextWait 
            };

            return res.status(200).send(
                `task.wait(${nextWait/1000})\nloadstring(game:HttpGet("https://${host}${currentPath}?step=1&id=${sessionID}&key=${firstKey}"))()`
            );
        }

        // STEP 1 - (N-1): Layering Tengah
        if (currentStep < SETTINGS.TOTAL_LAYERS) {
            const nextKey = Math.random().toString(36).substring(2, 8);
            const nextWait = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;

            sessions[ip].nextKey = nextKey;
            sessions[ip].lastTime = now;
            sessions[ip].requiredWait = nextWait;

            return res.status(200).send(
                `-- Layer ${currentStep}\ntask.wait(${nextWait/1000})\nloadstring(game:HttpGet("https://${host}${currentPath}?step=${currentStep + 1}&id=${id}&key=${nextKey}"))()`
            );
        }

        if (currentStep === SETTINGS.TOTAL_LAYERS) {
            await sendToDiscord(`✅ **SUCCESS**\n**IP:** \`${ip}\` passed ${SETTINGS.TOTAL_LAYERS} layers.`);
            delete sessions[ip]; // Bersihkan session
            return res.status(200).send(SETTINGS.REAL_SCRIPT.trim());
        }

    } catch (err) {
        return res.status(200).send("SECURITY : INTERNAL ERROR!");
    }
};
