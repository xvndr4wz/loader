const https = require('https');

// Database sederhana di RAM (Akan reset jika serverless restart)
let sessions = {};
let blacklist = {}; 

const WEBHOOK = "https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5";

function sendToDiscord(msg) {
    const data = JSON.stringify({ content: msg });
    const url = new URL(WEBHOOK);
    const req = https.request({
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    });
    req.on('error', () => {});
    req.write(data);
    req.end();
}

module.exports = async (req, res) => {
    try {
        const ip = req.headers['x-forwarded-for']?.split(',')[0] || "unknown";
        const agent = req.headers['user-agent'] || "";
        const { step, id, unban_key } = req.query;
        const host = req.headers.host;

        // OTOMATIS: Mendeteksi path file (misal: /api/script) agar tidak perlu ubah manual
        const currentPath = req.url.split('?')[0]; 
        const selfUrl = `https://${host}${currentPath}`;

        // --- 1. LOGIKA UNBAN ---
        if (unban_key) {
            try {
                const decoded = Buffer.from(unban_key, 'base64').toString('ascii');
                const [targetIP, timestamp] = decoded.split('_');
                if (targetIP && (Date.now() - parseInt(timestamp)) < 86400000) {
                    delete blacklist[targetIP];
                    res.setHeader('Content-Type', 'text/html');
                    return res.status(200).send(`
                        <body style="background:#000; color:#0f0; text-align:center; font-family:sans-serif; padding-top:100px;">
                            <h1>âœ… UNBANNED SUCCESSFUL</h1>
                            <p>IP <b>${targetIP}</b> is now cleared.</p>
                        </body>
                    `);
                }
            } catch (e) { return res.status(403).send("Invalid Token"); }
        }

        // --- 2. CEK STATUS BAN ---
        if (blacklist[ip]) {
            return res.status(403).send("game.Players.LocalPlayer:Kick('Zifi Security: Banned. Check Discord for Unban link.')");
        }

        // --- 3. PROTEKSI BROWSER (Hanya Roblox) ---
        if (!agent.includes("Roblox")) {
            return res.status(200).send("Unauthorized: Use Roblox Executor.");
        }

        // --- 4. STEP 1: HANDSHAKE ---
        if (!step) {
            const token = Math.random().toString(36).substring(7);
            sessions[ip] = { token, time: Date.now() };
            
            // Menggunakan selfUrl agar otomatis menyesuaikan nama file
            const nextStepUrl = `${selfUrl}?step=final&id=${token}`;
            return res.status(200).send(`local u="${nextStepUrl}"\nlocal r=game:HttpGet(u,true)\nif r then loadstring(r)() end`);
        }

        // --- 5. STEP 2: FINAL PAYLOAD ---
        if (step === "final") {
            const session = sessions[ip];
            if (session && session.token === id && (Date.now() - session.time) < 30000) {
                delete sessions[ip];

                // SCRIPT ROBLOX KAMU (LUAU)
                const luauScript = `local player = game.Players.LocalPlayer
local character = player.Character or player.CharacterAdded:Wait()
local humanoid = character:WaitForChild("Humanoid")

if humanoid and humanoid.Health > 0 then
    humanoid.Health = math.max(0, humanoid.Health - 50)
    print("Health reduced by 50!")
end

warn("ZiFi Security: Script Verified and Loaded!")`;
                
                return res.status(200).send(luauScript.trim());
            } else {
                // AUTO BAN JIKA AKSES ILEGAL/EXPIRED
                blacklist[ip] = true;
                const unbanToken = Buffer.from(`${ip}_${Date.now()}`).toString('base64');
                const unbanURL = `${selfUrl}?unban_key=${unbanToken}`;
                
                sendToDiscord(`ðŸš¨ **Violation Detected!**\n**IP:** \`${ip}\` banned.\n**Reason:** Handshake Bypass/Invalid Session.\n\n[Click Here to Unban](${unbanURL})`);
                
                return res.status(403).send("warn('Security Violation: IP Banned')");
            }
        }
    } catch (e) {
        console.error(e);
        return res.status(500).send("Internal Server Error");
    }
};
      
