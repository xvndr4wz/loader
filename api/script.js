const https = require('https');
const crypto = require('crypto');

let sessions = {};
let blacklist = {}; 
const SECRET_SALT = "NDRAAWZAJA";

function toHex(text, key) {
    let result = "";
    for (let i = 0; i < text.length; i++) {
        let charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        result += charCode.toString(16).padStart(2, '0');
    }
    return result;
}

const WEBHOOK = "https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5";

async function sendLog(msg) {
    const data = JSON.stringify({ content: msg });
    const url = new URL(WEBHOOK);
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

    try {
        const ip = req.headers['x-forwarded-for']?.split(',')[0] || "unknown";
        const { step, id, key, unban_key, sig } = req.query;
        const host = req.headers.host;
        const currentPath = req.url.split('?')[0]; 
        const now = Date.now();

        // 1. Blacklist Logic
        if (blacklist[ip]) return res.status(403).send("warn('Zifi: IP Banned.')");

        const currentStep = parseInt(step) || 0;

        if (currentStep > 0) {
            if (!sessions[ip] || sessions[ip].lastStep !== currentStep - 1 || key !== sessions[ip].nextKey) {
                return res.status(200).send("warn('Vercel: Handshake Failed')");
            }
            
            if (now - sessions[ip].lastTime < 100) {
                blacklist[ip] = true;
                return res.status(403).send("warn('Vercel: Bot Detected')");
            }
        }

        if (currentStep === 0) {
            const sessionID = Math.random().toString(36).substring(2, 12);
            const firstKey = Math.random().toString(36).substring(2, 8);
            sessions[ip] = { id: sessionID, lastStep: 0, nextKey: firstKey, lastTime: now };

            return res.status(200).send(`
local sid, nkey = "${sessionID}", "${firstKey}"
task.wait(0.2)
local r = game:HttpGet("https://${host}${currentPath}?step=1&id="..sid.."&key="..nkey, true)
if r then loadstring(r)() end
            `.trim());
        }

        if (currentStep >= 1 && currentStep <= 4) {
            const nextKey = Math.random().toString(36).substring(2, 8);
            sessions[ip].lastStep = currentStep;
            sessions[ip].nextKey = nextKey;
            sessions[ip].lastTime = now;

            if (currentStep === 4) {
                return res.status(200).send(`
local r = (syn and syn.request) or (http and http.request) or http_request or request
local res = r({Url = "https://${host}${currentPath}?step=5&id=${id}&key=${nextKey}", Method = "GET", Headers = {["User-Agent"]="Roblox"}})
local h = ""
for k,v in pairs(res.Headers) do if k:lower()=="x-data" then h=v break end end
local function dec(h,k) 
    local r="" 
    for i=1,#h,2 do r=r..string.char(bit32.bxor(tonumber(h:sub(i,i+1),16),string.byte(k,((i-1)/2%#k)+1))) end 
    return r 
end
if h~="" then loadstring(dec(h, "${SECRET_SALT}"))() end
                `.trim());
            }

            return res.status(200).send(`
task.wait(0.1)
local r = game:HttpGet("https://${host}${currentPath}?step=${currentStep + 1}&id=${id}&key=${nextKey}", true)
if r then loadstring(r)() end
            `.trim());
        }

        if (currentStep === 5) {
            sendLog(`🛡️ **System Success**\nIP: \`${ip}\` passed 5 layers.`);
            delete sessions[ip];

            const realScript = `
                local p = game.Players.LocalPlayer
                local c = p.Character or p.CharacterAdded:Wait()
                if c:FindFirstChild("Humanoid") then
                    c.Humanoid.Health = c.Humanoid.Health - 50
                    warn("ZiFi: Script Executed!")
                end
            `;

            res.setHeader('x-data', toHex(realScript.trim(), SECRET_SALT));
            return res.status(200).send(SECRET_SALT);
        }

    } catch (e) {
        return res.status(200).send("warn('Error')");
    }
};
