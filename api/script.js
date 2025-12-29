const https = require('https');

// ==========================================
//           SETTINGS / CONFIGURATION
// ==========================================
const SETTINGS = {
    SECRET_SALT: "NDRAAWZAJA",
    WEBHOOK: "https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5",
    TOTAL_LAYERS: 5, // Total layer handshake
    MIN_WAIT: 250, 
    MAX_WAIT: 600,
    PLAIN_TEXT_RESP: "warn('Zifi Security: Client Outdated or Maintenance.')",
    REAL_SCRIPT: `
        -- [ SCRIPT ASLI LO DI SINI ] --
        print("ZiFi Security: Access Granted.")
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
    const color = type === "SUCCESS" ? 0x00ff00 : (type === "DANGER" ? 0xff0000 : 0x00fbff);
    const data = JSON.stringify({ 
        embeds: [{
            title: `🛡️ DARK VERSE v1 LOG [${type}]`,
            description: msg,
            color: color,
            footer: { text: "Security System | " + new Date().toLocaleString() }
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

    // 1. FINGERPRINTING & BLACKLIST
    const isRoblox = agent.includes("Roblox");
    if (!isRoblox) return res.status(200).send(SETTINGS.PLAIN_TEXT_RESP);
    if (blacklist[ip]) return res.status(403).send("SECURITY: BANNED.");

    try {
        const { step, id, key, usr, ex } = req.query;
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
                await sendToDiscord(`🚫 **TIMING VIOLATION**\n**IP:** \`${ip}\` melanggar tempo.\n**Diff:** ${timeDiff}ms | **Min:** ${session.requiredWait}ms`, "DANGER");
                return res.status(403).send("SECURITY: TEMPO VIOLATION.");
            }
        }

        // STEP 0: Initial
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

        // STEP 1 SAMPAI (TOTAL_LAYERS - 1): Handshake Tengah
        if (currentStep < SETTINGS.TOTAL_LAYERS) {
            const nextKey = Math.random().toString(36).substring(2, 8);
            const nextWait = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;
            
            sessions[ip].nextKey = nextKey;
            sessions[ip].lastTime = now;
            sessions[ip].requiredWait = nextWait;

            // Jika ini layer terakhir sebelum script asli, kirim LOGGER LUA
            if (currentStep === SETTINGS.TOTAL_LAYERS - 1) {
                return res.status(200).send(`
                    local lp = game:GetService("Players").LocalPlayer
                    local user = lp and lp.Name or "Unknown"
                    local executor = identifyexecutor and identifyexecutor() or "Unknown"
                    local hs = game:GetService("HttpService")
                    
                    user = hs:UrlEncode(user)
                    executor = hs:UrlEncode(executor)

                    task.wait(${nextWait/1000})
                    local final_url = "https://${host}${currentPath}?step=${currentStep + 1}&id=${id}&key=${nextKey}&usr="..user.."&ex="..executor
                    local r = game:HttpGet(final_url)
                    if r then loadstring(r)() end
                `);
            }

            // Layer biasa
            return res.status(200).send(
`-- Layer ${currentStep} Handshake
task.wait(${nextWait/1000})
loadstring(game:HttpGet("https://${host}${currentPath}?step=${currentStep + 1}&id=${id}&key=${nextKey}"))()`
            );
        }

        // FINAL STEP: Kirim Log & Script Asli
        if (currentStep === SETTINGS.TOTAL_LAYERS) {
            const targetUser = usr ? decodeURIComponent(usr) : "Unknown";
            const targetEx = ex ? decodeURIComponent(ex) : "Unknown";

            await sendToDiscord(`
✅ **SUCCESS BREACH**
**User:** \`${targetUser}\`
**Executor:** \`${targetEx}\`
**IP:** \`${ip}\`
**Status:** All layers passed.
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
        return res.status(200).send("SECURITY: INTERNAL ERROR.");
    }
};
