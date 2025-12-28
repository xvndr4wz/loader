const https = require('https');
let sessions = {};
let blacklist = {}; 

const WEBHOOK = "WEBHOOK_KAMU";
const SECRET_KEY = "ZiFi_Secure_99"; // Kunci untuk enkripsi

// Fungsi Enkripsi agar isi script tidak bisa dibaca tanpa kunci
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

        // Proteksi Browser
        if (!agent.includes("Roblox")) {
            return res.status(200).send("Unauthorized.");
        }

        // STEP 1: Handshake (Mengirim Loader Terenkripsi)
        if (!step) {
            const token = Math.random().toString(36).substring(7);
            sessions[ip] = { token, time: Date.now() };
            
            // Mengirim loader yang akan meminta payload final
            return res.status(200).send(`
                local u = "https://${req.headers.host}${req.url.split('?')[0]}?step=final&id=${token}"
                local d = game:HttpGet(u)
                local function decode(data, key)
                    local res = ""
                    local b64 = game:GetService("HttpService"):DecodeBase64(data)
                    for i = 1, #b64 do
                        res = res .. string.char(bit32.bxor(string.byte(b64, i), string.byte(key, (i-1) % #key + 1)))
                    end
                    return res
                end
                loadstring(decode(d, "${SECRET_KEY}"))()
            `.trim());
        }

        // STEP 2: Final Payload (Mengirim Script yang sudah Di-encrypt)
        if (step === "final") {
            const session = sessions[ip];
            if (session && session.token === id) {
                const luauScript = `print("Script Aman!") -- ISI SCRIPT ASLI LU DISINI`;
                
                // DATA DIKIRIM DALAM BENTUK TERENKRIPSI
                return res.status(200).send(encrypt(luauScript.trim(), SECRET_KEY));
            }
            return res.status(403).send("Forbidden");
        }
    } catch (e) { return res.status(500).send("Error"); }
};
