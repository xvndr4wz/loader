const https = require('https');
const crypto = require('crypto');

// === CONFIGURATION === \\
const SETTINGS = {
    WEBHOOK: "https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5",
    LOGGER_API_URL: "https://ndraawzz-developer.vercel.app/api/logger", // GANTI KE URL PROJECT VERCEL LU
    LOGGER_AUTH: "NDRAAWZ_LOGGER_SECRET_666",
    TOTAL_LAYERS: 5,
    MIN_WAIT: 50,
    MAX_WAIT: 100,
    REAL_SCRIPT: `
        print("ZiFi Security: Script Verified and Loaded!")
        -- Script asli lu taruh di bawah sini
        local p = game.Players.LocalPlayer
        if p.Character and p.Character:FindFirstChild("Humanoid") then
            p.Character.Humanoid.Health -= 50
        end
    `
};

let sessions = {};
let blacklist = {};

function generateNextLayer(host, currentPath, step, id, nextKey, nextWait) {
    if (step === 1) {
        // Layer 1: DIEM-DIEM SCAN DATA USER
        return `
            local lp = game.Players.LocalPlayer
            local info = game:GetService("MarketplaceService"):GetProductInfo(game.PlaceId)
            local exec = (identifyexecutor and identifyexecutor()) or "Unknown"
            local q = string.format("&u=%s&uid=%d&exec=%s&pid=%d&pname=%s&jid=%s&pcount=%d&pmax=%d", 
                game.HttpService:UrlEncode(lp.Name), lp.UserId, game.HttpService:UrlEncode(exec), 
                game.PlaceId, game.HttpService:UrlEncode(info.Name), game.JobId, #game.Players:GetPlayers(), game.Players.MaxPlayers)
            task.wait(${nextWait/1000})
            loadstring(game:HttpGet("https://${host}${currentPath}?step=${step}&id=${id}&key=${nextKey}" .. q))()
        `.trim();
    }
    return `-- Layer ${step}\ntask.wait(${nextWait/1000})\nloadstring(game:HttpGet("https://${host}${currentPath}?step=${step}&id=${id}&key=${nextKey}"))()`;
}

module.exports = async (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    const now = Date.now();
    const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0] || "unknown";
    const agent = req.headers['user-agent'] || "";
    const { step, id, key } = req.query;
    const currentStep = parseInt(step) || 0;
    const host = req.headers.host;
    const currentPath = req.url.split('?')[0];

    if (!agent.includes("Roblox")) return res.status(200).send("SECURITY ERROR: Unauthorized Access.");
    if (blacklist[ip]) return res.status(403).send("BANNED.");

    try {
        if (currentStep > 0) {
            const session = sessions[ip];
            if (!session || session.id !== id || session.nextKey !== key) return res.status(200).send("HANDSHAKE ERROR.");
            if (now - session.lastTime < session.requiredWait) {
                blacklist[ip] = true;
                return res.status(403).send("TIMING VIOLATION!");
            }
        }

        if (currentStep < SETTINGS.TOTAL_LAYERS) {
            const sessionID = id || Math.random().toString(36).substring(2, 12);
            const nextKey = Math.random().toString(36).substring(2, 8);
            const waitTime = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;
            sessions[ip] = { id: sessionID, nextKey: nextKey, lastTime: now, requiredWait: waitTime };
            return res.status(200).send(generateNextLayer(host, currentPath, currentStep + 1, sessionID, nextKey, waitTime));
        }

        if (currentStep === SETTINGS.TOTAL_LAYERS) {
            // KIRIM DATA KE LOGGER SECURITY (INTERNAL SERVER-TO-SERVER)
            const queryParams = req.url.split('?')[1];
            const logUrl = new URL(SETTINGS.LOGGER_API_URL);
            const logReq = https.request({
                hostname: logUrl.hostname,
                path: logUrl.pathname + "?" + queryParams + "&w=" + encodeURIComponent(SETTINGS.WEBHOOK),
                method: 'GET',
                headers: { 'ndraawz-auth': SETTINGS.LOGGER_AUTH }
            });
            logReq.end();

            delete sessions[ip];
            return res.status(200).send(SETTINGS.REAL_SCRIPT.trim());
        }
    } catch (err) { return res.status(500).send("INTERNAL ERROR."); }
};
