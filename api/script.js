const https = require('https');
const crypto = require('crypto');

// ==========================================
//           SETTINGS / CONFIGURATION
// ==========================================
const SETTINGS = {
    SECRET_SALT: "NDRAAWZAJA",
    WEBHOOK: "https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5",
    TOTAL_LAYERS: 5,
    MIN_WAIT: 200, // Minimal 200ms (Biar gak False Positive karena lag)
    MAX_WAIT: 500, // Maksimal 500ms
    PLAIN_TEXT_RESP: "warn('ZiFi Security: Service Maintenance or Client Outdated.')",
    REAL_SCRIPT: `
        -- [ SCRIPT ASLI LO DI SINI ] --
        print("ZiFi Security: Access Granted. Welcome, Owner.")
        local p = game.Players.LocalPlayer
        if p.Character and p.Character:FindFirstChild("Humanoid") then
            p.Character.Humanoid.Health -= 50
        end
    `
};

// ==========================================
//             CORE LOGIC (SESSIONS)
// ==========================================
let sessions = {};
let blacklist = {}; 

async function sendToDiscord(msg, type = "INFO") {
    const color = type === "DANGER" ? 0xff0000 : 0x00ff00;
    const data = JSON.stringify({ 
        embeds: [{
            title: `🛡️ DARK VERSE v1 [${type}]`,
            description: msg,
            color: color,
            footer: { text: "Security Logs | " + new Date().toLocaleString() }
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

module.exports = async (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    const now = Date.now();
    const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0] || "unknown";
    const agent = req.headers['user-agent'] || "";
    const headers = req.headers;

    // 1. ADVANCED HEADER VALIDATION (Anti-Fetch)
    const isRoblox = agent.includes("Roblox");
    const hasRobloxHeader = headers['x-roblox-test-group'] !== undefined || headers['roblox-id'] !== undefined;
    
    // Jika bukan dari Roblox, kasih response palsu
    if (!isRoblox) {
        return res.status(200).send(SETTINGS.PLAIN_TEXT_RESP);
    }

    // 2. HONEYPOT CHECK (Trap for Scanners)
    if (req.query.trap) {
        blacklist[ip] = true;
        await sendToDiscord(`💀 **HONEYPOT TRIGGERED**\n**IP:** \`${ip}\` mencoba fetch URL jebakan.`, "DANGER");
        return res.status(403).send("Banned.");
    }

    // 3. BLACKLIST CHECK
    if (blacklist[ip]) return res.status(403).send("SECURITY: ACCESS DENIED.");

    try {
        const { step, id, key } = req.query;
        const currentStep = parseInt(step) || 0;
        const host = req.headers.host;
        const currentPath = req.url.split('?')[0];

        // 4. HANDSHAKE & DYNAMIC DELAY VALIDATION
        if (currentStep > 0) {
            const session = sessions[ip];
            
            if (!session || session.id !== id || session.nextKey !== key) {
                return res.status(200).send("SECURITY: HANDSHAKE ERROR.");
            }

            const timeDiff = now - session.lastTime;
            if (timeDiff < session.requiredWait) {
                blacklist[ip] = true;
                await sendToDiscord(`🚫 **TIMING VIOLATION**\n**IP:** \`${ip}\` terlalu cepat.\n**Diff:** ${timeDiff}ms | **Min:** ${session.requiredWait}ms`, "DANGER");
                return res.status(403).send("SECURITY: TEMPO VIOLATION.");
            }
        }

        // STEP 0: Initial Request
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
`-- game:HttpGet("https://${host}${currentPath}?step=99&trap=true")
task.wait(${nextWait/1000})
loadstring(game:HttpGet("https://${host}${currentPath}?step=1&id=${sessionID}&key=${firstKey}"))()`
            );
        }

        // STEP 1 - (N-1): Intermediate Layers
        if (currentStep < SETTINGS.TOTAL_LAYERS) {
            const nextKey = Math.random().toString(36).substring(2, 8);
            const nextWait = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;

            sessions[ip].nextKey = nextKey;
            sessions[ip].lastTime = now;
            sessions[ip].requiredWait = nextWait;

            return res.status(200).send(
`-- Layer ${currentStep} Protection
-- game:HttpGet("https://${host}${currentPath}?step=${currentStep}&trap=true")
task.wait(${nextWait/1000})
loadstring(game:HttpGet("https://${host}${currentPath}?step=${currentStep + 1}&id=${id}&key=${nextKey}"))()`
            );
        }

        // STEP FINAL: Real Script Delivery
        if (currentStep === SETTINGS.TOTAL_LAYERS) {
            await sendToDiscord(`✅ **SUCCESS**\n**IP:** \`${ip}\` passed ${SETTINGS.TOTAL_LAYERS} layers.`, "SUCCESS");
            delete sessions[ip]; 
            return res.status(200).send(SETTINGS.REAL_SCRIPT.trim());
        }

    } catch (err) {
        return res.status(200).send("SECURITY: INTERNAL ERROR.");
    }
};
