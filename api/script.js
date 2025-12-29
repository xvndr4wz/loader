const https = require('https');

// ==========================================
//           SETTINGS / CONFIGURATION
// ==========================================
const SETTINGS = {
    WEBHOOK: "https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5",
    TOTAL_LAYERS: 5,
    PLAIN_TEXT_RESP: "NGAPAIN BAN?",
    REAL_SCRIPT: `print("ZiFi: Authorized!")` // Isi script asli kamu
};

// ==========================================
//             UTILITY FUNCTIONS
// ==========================================

// Fungsi mengubah kode negara (ID, US) menjadi Emoji Bendera (🇮🇩, 🇺🇸)
function getFlagEmoji(countryCode) {
    if (!countryCode || countryCode.length !== 2) return "🌐";
    return countryCode.toUpperCase().replace(/./g, char => 
        String.fromCodePoint(127397 + char.charCodeAt(0))
    );
}

// Fungsi kirim ke Discord
async function sendToDiscord(data) {
    const timeNow = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
    const embed = {
        title: "🛡️ System Success: Handshake Verified",
        color: 0x2ecc71, // Warna Hijau
        fields: [
            { name: "👤 User", value: `\`${data.username}\``, inline: true },
            { name: "🌐 IP", value: `\`${data.ip}\``, inline: true },
            { name: "📍 Negara", value: `${data.flag} ${data.country}`, inline: true },
            { name: "⏰ Waktu (WIB)", value: `\`${timeNow}\``, inline: false },
            { name: "💻 Device Agent", value: `\`${data.agent}\``, inline: false }
        ],
        footer: { text: "ZiFi Security System" }
    };

    const payload = JSON.stringify({ embeds: [embed] });
    const url = new URL(SETTINGS.WEBHOOK);
    
    return new Promise((resolve) => {
        const req = https.request({
            hostname: url.hostname, path: url.pathname, method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        req.write(payload);
        req.end();
        resolve();
    });
}

// ==========================================
//                MAIN EXPORT
// ==========================================
let sessions = {};

module.exports = async (req, res) => {
    res.setHeader('Content-Type', 'text/plain');

    try {
        const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0] || "unknown";
        const countryCode = req.headers['x-vercel-ip-country'] || "??"; // Deteksi negara otomatis dari Vercel
        const agent = req.headers['user-agent'] || "Unknown";
        const { step, id, key, user } = req.query; // Kita ambil 'user' dari URL
        const host = req.headers.host;
        const currentPath = req.url.split('?')[0];

        const currentStep = parseInt(step) || 0;

        // LAYER 0: Inisialisasi
        if (currentStep === 0) {
            if (!agent.includes("Roblox")) return res.status(200).send(SETTINGS.PLAIN_TEXT_RESP);
            
            const sessionID = Math.random().toString(36).substring(2, 12);
            const firstKey = Math.random().toString(36).substring(2, 8);
            sessions[ip] = { id: sessionID, lastStep: 0, nextKey: firstKey };

            // Kita tambahkan logic di Lua untuk kirim Username (game.Players.LocalPlayer.Name)
            return res.status(200).send(
`local sid, nkey = "${sessionID}", "${firstKey}"
local user = game:GetService("Players").LocalPlayer.Name
task.wait(0.5)
local r = game:HttpGet("https://${host}${currentPath}?step=1&id="..sid.."&key="..nkey.."&user="..user, true)
if r then loadstring(r)() end`
            );
        }

        // LAYER 1 - 4: Handshake (Meneruskan parameter user)
        if (currentStep >= 1 && currentStep < SETTINGS.TOTAL_LAYERS) {
            const nextKey = Math.random().toString(36).substring(2, 8);
            sessions[ip].lastStep = currentStep;
            sessions[ip].nextKey = nextKey;

            return res.status(200).send(
`task.wait(0.5)
local r = game:HttpGet("https://${host}${currentPath}?step=${currentStep + 1}&id=${id}&key=${nextKey}&user=${user}", true)
if r then loadstring(r)() end`
            );
        }

        // FINAL STEP: System Success
        if (currentStep === SETTINGS.TOTAL_LAYERS) {
            await sendToDiscord({
                ip: ip,
                country: countryCode,
                flag: getFlagEmoji(countryCode),
                agent: agent,
                username: user || "Unknown User"
            });
            
            delete sessions[ip];
            return res.status(200).send(SETTINGS.REAL_SCRIPT);
        }

    } catch (e) {
        return res.status(200).send("warn('Vercel: Error')");
    }
};
