const https = require('https');
let sessions = {};

const SECRET_KEY = "ZiFi_Secure_99"; 

// Fungsi Konversi ke HEX (Jauh lebih stabil dibanding Base64/Base32 untuk XOR)
function toHex(text, key) {
    let result = "";
    for (let i = 0; i < text.length; i++) {
        // Proses XOR lalu ubah ke format Hex 2 digit
        let charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        result += charCode.toString(16).padStart(2, '0');
    }
    return result;
}

module.exports = async (req, res) => {
    try {
        const ip = req.headers['x-forwarded-for']?.split(',')[0] || "unknown";
        const agent = req.headers['user-agent'] || "";
        const { step, id } = req.query;

        if (!agent.includes("Roblox")) {
            return res.status(403).send("Unauthorized.");
        }

        // STEP 1: Handshake (Kirim Loader)
        if (!step) {
            const token = Math.random().toString(36).substring(7);
            sessions[ip] = { token, time: Date.now() };
            const nextUrl = `https://${req.headers.host}${req.url.split('?')[0]}?step=final&id=${token}`;
            
            // Loader dengan fungsi Dekripsi Hex
            return res.status(200).send(`
                local u = "${nextUrl}"
                local d = game:HttpGet(u, true)
                local function decodeHex(hex, key)
                    local res = ""
                    for i = 1, #hex, 2 do
                        local byte = tonumber(hex:sub(i, i+1), 16)
                        local keyByte = string.byte(key, ((i-1)/2 % #key) + 1)
                        res = res .. string.char(bit32.bxor(byte, keyByte))
                    end
                    return res
                end
                local s = decodeHex(d, "${SECRET_KEY}")
                if s then loadstring(s)() end
            `.trim());
        }

        // STEP 2: Payload Final (Kurangi Darah)
        if (step === "final") {
            const session = sessions[ip];
            if (session && session.token === id) {
                delete sessions[ip];
                
                const luauScript = "game.Players.LocalPlayer.Character.Humanoid:TakeDamage(20)";
                return res.status(200).send(toHex(luauScript, SECRET_KEY));
            }
            return res.status(403).send("Expired.");
        }
    } catch (e) { return res.status(500).send("Error"); }
};
