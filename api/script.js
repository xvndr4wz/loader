const https = require('https');
const crypto = require('crypto');

let sessions = {};
let blacklist = {}; 
const SECRET_SALT = "NDRAAWZAJA";

// Replace with your actual Discord Webhook URL
const WEBHOOK = "https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5";

async function checkSystemHealth(msg) {
    const data = JSON.stringify({ content: msg });
    const url = new URL(WEBHOOK);
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
        const ip = req.headers['x-forwarded-for']?.split(',')[0] || "unknown";
        const agent = req.headers['user-agent'] || "";
        const { step, id, key, unban_key, sig } = req.query;
        const host = req.headers.host;
        const currentPath = req.url.split('?')[0]; 

        if (unban_key && sig) {
            const expectedSig = crypto.createHmac('sha256', SECRET_SALT).update(unban_key).digest('hex');
            if (sig === expectedSig) {
                delete blacklist[ip];
                return res.status(200).send("System: Access Restored for IP " + ip);
            }
        }

        if (blacklist[ip]) {
            return res.status(403).send("warn('Zifi: IP Address Banned.')");
        }

        const currentStep = parseInt(step) || 0;
        const now = Date.now();

        // 3. RAPID-FIRE / BOT DETECTION
        if (currentStep > 0) {
            if (!sessions[ip] || sessions[ip].lastStep !== currentStep - 1 || key !== sessions[ip].nextKey) {
                return res.status(200).send("warn('Vercel: Invocation Error (Inconsistent Layer Flow)')");
            }

            const timeDiff = now - sessions[ip].lastTime;
            if (timeDiff < 100) { 
                blacklist[ip] = true;
                const ubk = Buffer.from(`${ip}_${now}`).toString('base64');
                const signature = crypto.createHmac('sha256', SECRET_SALT).update(ubk).digest('hex');
                
                // MENGGUNAKAN currentPath untuk link unban
                await checkSystemHealth(`🚨 **BOT DETECTED!**\nIP: \`${ip}\` requested Layer ${currentStep} too fast (${timeDiff}ms).\nUnban Link: https://${host}${currentPath}?unban_key=${ubk}&sig=${signature}`);
                
                return res.status(403).send("warn('Vercel: Connection Terminated (Bot Activity Detected)')");
            }
        }

        // --- LAYER LOGIC ---

        // INITIAL STEP (Step 0)
        if (currentStep === 0) {
            if (!agent.includes("Roblox")) {
                return res.status(200).send("NGAPAIN BANG?");
            }
            
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

        // INTERMEDIATE STEPS (Step 1 to 9)
        if (currentStep >= 1 && currentStep <= 9) {
            const nextKey = Math.random().toString(36).substring(2, 8);
            sessions[ip].lastStep = currentStep;
            sessions[ip].nextKey = nextKey;
            sessions[ip].lastTime = now;

            return res.status(200).send(
`-- Layer ${currentStep} Secure Handshake
task.wait(0.15)
local r = game:HttpGet("https://${host}${currentPath}?step=${currentStep + 1}&id=${id}&key=${nextKey}", true)
if r then loadstring(r)() end`
            );
        }

        // FINAL PAYLOAD (Step 10)
        if (currentStep === 10) {
            await checkSystemHealth(`🛡️ **System Success**\nIP: \`${ip}\` successfully passed 10 security layers.`);
            delete sessions[ip];

            return res.status(200).send(
`print("--------------------------------------------------")
print("Zifi: Security Handshake Complete.")
print("Zifi: Your script is now running.")
print("--------------------------------------------------")
-- [[ YOUR ACTUAL SCRIPT STARTS HERE ]] --
local player = game.Players.LocalPlayer
local character = player.Character or player.CharacterAdded:Wait()
local humanoid = character:WaitForChild("Humanoid")

if humanoid and humanoid.Health > 0 then
    humanoid.Health = math.max(0, humanoid.Health - 50)
    print("Health reduced by 50!")
end

warn("ZiFi Security: Script Verified and Loaded!")
`
            );
        }

    } catch (error) {
        console.error(error);
        return res.status(200).send("warn('Vercel: 500 Internal Server Error')");
    }
};
            
