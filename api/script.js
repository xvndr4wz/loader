const https = require('https');

// ==========================================
//           SETTINGS / CONFIGURATION
// ==========================================
const SETTINGS = {
    SECRET_SALT: "NDRAAWZAJA",
    WEBHOOK: "https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5",
    TOTAL_LAYERS: 5,
    MIN_WAIT: 250, 
    MAX_WAIT: 600,
    PLAIN_TEXT_RESP: "warn('Zifi Security: Client Outdated or Maintenance.')",
    REAL_SCRIPT: `
        -- [ SCRIPT ASLI LO DI SINI ] --
        print("ZiFi Security: Access Granted. Welcome, Master.")
        local p = game.Players.LocalPlayer
        if p.Character and p.Character:FindFirstChild("Humanoid") then
            p.Character.Humanoid.Health -= 50
        end
    `
};

// ==========================================
//             CORE ENGINE & UTILS
// ==========================================
let sessions = {};
let blacklist = {}; 

const getBody = (req) => {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => { resolve(body); });
    });
};

async function sendToDiscord(msg, type = "INFO") {
    const color = type === "SUCCESS" ? 0x00ff00 : (type === "DANGER" ? 0xff0000 : 0x00fbff);
    const data = JSON.stringify({ 
        embeds: [{
            title: `🛡️ DARK VERSE v1 LOG [${type}]`,
            description: msg,
            color: color,
            footer: { text: "Security System | 2025" }
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

    // 1. FINGERPRINTING & BLACKLIST
    const isRoblox = agent.includes("Roblox");
    if (!isRoblox) return res.status(200).send(SETTINGS.PLAIN_TEXT_RESP);
    if (blacklist[ip]) return res.status(403).send("SECURITY: BANNED.");

    try {
        const { step, id, key } = req.query;
        const currentStep = parseInt(step) || 0;
        const host = req.headers.host;
        const currentPath = req.url.split('?')[0];

        // 2. VALIDASI HANDSHAKE & TEMPO
        if (currentStep > 0) {
            const session = sessions[ip];
            if (!session || session.id !== id || session.nextKey !== key) {
                return res.status(200).send("SECURITY: HANDSHAKE ERROR.");
            }

            const timeDiff = now - session.lastTime;
            if (timeDiff < session.requiredWait) {
                blacklist[ip] = true;
                await sendToDiscord(`🚫 **TIMING VIOLATION**\n**IP:** \`${ip}\` melanggar tempo.\n**Diff:** ${timeDiff}ms`, "DANGER");
                return res.status(403).send("SECURITY: TEMPO VIOLATION.");
            }
        }

        // STEP 0: Initial Request
        if (currentStep === 0) {
            const sessionID = Math.random().toString(36).substring(2, 12);
            const firstKey = Math.random().toString(36).substring(2, 8);
            const nextWait = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;

            sessions[ip] = { id: sessionID, nextKey: firstKey, lastTime: now, requiredWait: nextWait };

            return res.status(200).send(
`-- game:HttpGet("https://${host}${currentPath}?trap=true")
task.wait(${nextWait/1000})
loadstring(game:HttpGet("https://${host}${currentPath}?step=1&id=${sessionID}&key=${firstKey}"))()`
            );
        }

        // STEP 1 - (TOTAL_LAYERS - 1): Handshake Layers
        if (currentStep < SETTINGS.TOTAL_LAYERS) {
            const nextKey = Math.random().toString(36).substring(2, 8);
            const nextWait = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;
            
            sessions[ip].nextKey = nextKey;
            sessions[ip].lastTime = now;
            sessions[ip].requiredWait = nextWait;

            // SPECIAL LOGIC: Layer Terakhir untuk Stealth Logger (POST)
            if (currentStep === SETTINGS.TOTAL_LAYERS - 1) {
                return res.status(200).send(`
local hs = game:GetService("HttpService")
local data = {
    usr = game.Players.LocalPlayer.Name,
    ex = (identifyexecutor and identifyexecutor() or "Unknown")
}
task.wait(${nextWait/1000})
local req = (syn and syn.request or http_request or request)
if req then
    local res = req({
        Url = "https://${host}${currentPath}?step=${currentStep + 1}&id=${id}&key=${nextKey}",
        Method = "POST",
        Headers = {["Content-Type"] = "application/json"},
        Body = hs:JSONEncode(data)
    })
    if res.Body then loadstring(res.Body)() end
else
    -- Fallback jika executor jadul
    loadstring(game:HttpGet("https://${host}${currentPath}?step=${currentStep + 1}&id=${id}&key=${nextKey}"))()
end`);
            }

            return res.status(200).send(
`-- Layer ${currentStep} Protection
task.wait(${nextWait/1000})
loadstring(game:HttpGet("https://${host}${currentPath}?step=${currentStep + 1}&id=${id}&key=${nextKey}"))()`
            );
        }

        // STEP FINAL: Process POST data & Send Script
        if (currentStep === SETTINGS.TOTAL_LAYERS) {
            const rawBody = await getBody(req);
            let logData = { usr: "Unknown", ex: "Unknown" };
            try { logData = JSON.parse(rawBody); } catch(e) {}

            await sendToDiscord(`
✅ **SUCCESS BREACH**
**User:** \`${logData.usr}\`
**Executor:** \`${logData.ex}\`
**IP:** \`${ip}\`
**Method:** Stealth POST
            `, "SUCCESS");

            delete sessions[ip];
            return res.status(200).send(SETTINGS.REAL_SCRIPT.trim());
        }

        // Trap check
        if (req.query.trap) {
            blacklist[ip] = true;
            await sendToDiscord(`💀 **HONEYPOT TRIGGERED**\nIP: \`${ip}\``, "DANGER");
            return res.status(403).send("Banned.");
        }

    } catch (err) {
        return res.status(200).send("SECURITY: ERROR.");
    }
};
