const https = require('https');
let sessions = {};

const SECRET_KEY = "ZiFi_Secure_99"; // JANGAN DIUBAH (Harus sama dengan di Roblox)

function encrypt(text, key) {
    let result = "";
    for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return Buffer.from(result).toString('base64');
}

module.exports = async (req, res) => {
    try {
        const ip = req.headers['x-forwarded-for']?.split(',')[0] || "unknown";
        const agent = req.headers['user-agent'] || "";
        const { step, id } = req.query;

        // Proteksi: Hanya boleh diakses lewat Roblox
        if (!agent.includes("Roblox")) {
            return res.status(403).send("Unauthorized: Use Roblox Executor.");
        }

        // STEP 1: Handshake
        if (!step) {
            const token = Math.random().toString(36).substring(7);
            sessions[ip] = { token, time: Date.now() };
            
            const nextUrl = `https://${req.headers.host}${req.url.split('?')[0]}?step=final&id=${token}`;
            
            // Loader yang akan muncul di HTTP Spy (Isinya aman karena terenkripsi)
            return res.status(200).send(`
                local u = "${nextUrl}"
                local d = game:HttpGet(u, true)
                local function dec(data, key)
                    local b64 = game:GetService("HttpService"):DecodeBase64(data:gsub("%s+", ""))
                    local res = ""
                    for i = 1, #b64 do
                        res = res .. string.char(bit32.bxor(string.byte(b64, i), string.byte(key, (i-1) % #key + 1)))
                    end
                    return res
                end
                local s = dec(d, "${SECRET_KEY}")
                if s then loadstring(s)() end
            `.trim());
        }

        // STEP 2: Payload Final (Script Kurang Darah)
        if (step === "final") {
            const session = sessions[ip];
            if (session && session.token === id && (Date.now() - session.time) < 30000) {
                delete sessions[ip];

                // SCRIPT ASLI (Payload)
                const luauScript = `
                    local player = game.Players.LocalPlayer
                    if player and player.Character and player.Character:FindFirstChild("Humanoid") then
                        player.Character.Humanoid:TakeDamage(20) -- Mengurangi darah sebanyak 20
                        warn("ZiFi Security: Payload Executed. Health Reduced.")
                    end
                `;
                
                return res.status(200).send(encrypt(luauScript.trim(), SECRET_KEY));
            }
            return res.status(403).send("Session Expired or Invalid.");
        }
    } catch (e) {
        return res.status(500).send("Error");
    }
};
