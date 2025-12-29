const https = require('https');
const crypto = require('crypto');

// ==========================================
//           SETTINGS / CONFIGURATION
// ==========================================
const SETTINGS = {
    SECRET_SALT: "NDRAAWZAJA",
    WEBHOOK: "https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5",
    TOTAL_LAYERS: 3,
    PLAIN_TEXT_RESP: "u are a idiot",
    REAL_SCRIPT: `
        local player = game.Players.LocalPlayer
        local character = player.Character or player.CharacterAdded:Wait()
        local humanoid = character:WaitForChild("Humanoid")

        if humanoid and humanoid.Health > 0 then
            humanoid.Health = math.max(0, humanoid.Health - 50)
            print("Health reduced by 50!")
        end
        warn("ZiFi Security: Script Verified and Loaded!")
    `
};

// ==========================================
//             CORE LOGIC (DANGER)
// ==========================================
let sessions = {};
let blacklist = {}; 

async function sendToDiscord(msg) {
    const data = JSON.stringify({ content: msg });
    const url = new URL(SETTINGS.WEBHOOK);
    return new Promise((resolve) => {
        const req = https.request({
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            timeout: 1500,
            headers: { 'Content-Type': 'application/json' }
        }, (res) => resolve(res.statusCode >= 200 && res.statusCode < 300));
        req.on('error', () => resolve(false));
        req.write(data);
        req.end();
    });
}

module.exports = async (req, res) => {
    res.setHeader('Content-Type', 'text/plain');

    try {
        const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0] || "unknown";
        const agent = req.headers['user-agent'] || "";
        const { step, id, key, unban_key, sig } = req.query;
        const host = req.headers.host;
        const currentPath = req.url.split('?')[0]; 
        const now = Date.now();

        // Ban System
        if (unban_key && sig) {
            const expectedSig = crypto.createHmac('sha256', SETTINGS.SECRET_SALT).update(unban_key).digest('hex');
            if (sig === expectedSig) { delete blacklist[ip]; return res.status(200).send("Access Restored."); }
        }
        if (blacklist[ip]) return res.status(403).send("warn('Zifi: Banned.')");

        const currentStep = parseInt(step) || 0;

        // Security Validation
        if (currentStep > 0) {
            if (!sessions[ip] || sessions[ip].lastStep !== currentStep - 1 || key !== sessions[ip].nextKey) {
                return res.status(200).send("warn('Vercel: Handshake Error')");
            }
            if (now - sessions[ip].lastTime < 100) { 
                blacklist[ip] = true;
                return res.status(403).send("warn('Vercel: Connection Terminated')");
            }
        }

        // STEP 0: Initial
        if (currentStep === 0) {
            if (!agent.includes("Roblox")) return res.status(200).send(SETTINGS.PLAIN_TEXT_RESP);
            
            const sessionID = Math.random().toString(36).substring(2, 12);
            const firstKey = Math.random().toString(36).substring(2, 8);
            sessions[ip] = { id: sessionID, lastStep: 0, nextKey: firstKey, lastTime: now };

            return res.status(200).send(
`local sid, nkey = "${sessionID}", "${firstKey}"
task.wait(0.2)
local response = game:HttpGet("https://${host}${currentPath}?step=1&id="..sid.."&key="..nkey, true)
if response then loadstring(response)() end`
            );
        }

        // STEP 1 to (N-1): Intermediate
        if (currentStep >= 1 && currentStep < SETTINGS.TOTAL_LAYERS) {
            const nextKey = Math.random().toString(36).substring(2, 8);
            sessions[ip].lastStep = currentStep;
            sessions[ip].nextKey = nextKey;
            sessions[ip].lastTime = now;

            return res.status(200).send(
`-- Layer ${currentStep} Handshake
task.wait(0.15)
local r = game:HttpGet("https://${host}${currentPath}?step=${currentStep + 1}&id=${id}&key=${nextKey}", true)
if r then loadstring(r)() end`
            );
        }

        // FINAL STEP
        if (currentStep === SETTINGS.TOTAL_LAYERS) {
            await sendToDiscord(`🛡️ **System Success**\nIP: \`${ip}\` (Real IP) passed ${SETTINGS.TOTAL_LAYERS} layers.`);
            delete sessions[ip];
            return res.status(200).send(SETTINGS.REAL_SCRIPT.trim());
        }

    } catch (error) {
        return res.status(200).send("warn('Vercel: 500 Error')");
    }
};
