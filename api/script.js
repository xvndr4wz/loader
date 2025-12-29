const https = require('https');
const crypto = require('crypto');

// === SETTINGS === \\
const SETTINGS = {
    SECRET_SALT: "NDRAAWZGANTENG",
    WEBHOOK: "https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5",
    AUTH_KEY: "NDRAAWZ_GANTENG_666", // Key buat proteksi API
    TOTAL_LAYERS: 5,
    MIN_WAIT: 50,
    MAX_WAIT: 100,
    PLAIN_TEXT_RESP: "https://ndraawzz-developer.vercel.app/api/script",
    REAL_SCRIPT: `
        print("ZiFi Security: Script Verified and Loaded!")
        -- Script asli lu taruh sini
    `
};

// === MEMORY === \\
let sessions = {};
let blacklist = {}; 

// === FUNGSI STEALTH LOGGER (INTERNAL) === \\
async function sendStealthLog(ip, status, extraData = {}) {
    return new Promise((resolve) => {
        // Ambil data IP secara internal biar gak keliatan di HTTP Spy
        https.get(`https://ipwho.is/${ip}`, (res) => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => {
                const geo = JSON.parse(body);
                const flag = geo.country_code ? geo.country_code.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397)) : "🏴‍☠️";

                const embed = {
                    title: status === "SUCCESS" ? "✅ Layer Cleared!" : "🚫 Security Alert!",
                    color: status === "SUCCESS" ? 0x00ff00 : 0xff0000,
                    fields: [
                        { name: "🌐 IP Address", value: `\`${ip}\``, inline: true },
                        { name: "📍 Location", value: `${flag} ${geo.city || "Unknown"}, ${geo.country || "Unknown"}`, inline: true },
                        { name: "👤 User", value: extraData.username || "Unknown", inline: true },
                        { name: "💻 Executor", value: extraData.executor || "Unknown", inline: true },
                        { name: "🛡️ Result", value: status === "SUCCESS" ? "Access Granted" : "Banned/Bot Detected", inline: false }
                    ],
                    footer: { text: "Ndraawz | " + new Date().toLocaleString() }
                };

                const url = new URL(SETTINGS.WEBHOOK);
                const req = https.request({
                    hostname: url.hostname, path: url.pathname, method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                req.write(JSON.stringify({ embeds: [embed] }));
                req.end(() => resolve(true));
            });
        }).on('error', () => resolve(false));
    });
}

// === FUNGSI LAYER GENERATOR === \\
function generateNextLayer(host, currentPath, step, id, nextKey, nextWait) {
    return `-- Layer ${step}\ntask.wait(${nextWait/1000})\nloadstring(game:HttpGet("https://${host}${currentPath}?step=${step}&id=${id}&key=${nextKey}"))()`;
}

// === MAIN HANDLER === \\
module.exports = async (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    const now = Date.now();
    const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0] || "unknown";
    const agent = req.headers['user-agent'] || "";
    const { step, id, key, u, e } = req.query; // u = username, e = executor (optional)
    const currentStep = parseInt(step) || 0;
    const host = req.headers.host;
    const currentPath = req.url.split('?')[0];

    // == VALIDASI ROBLOX == \\
    if (!agent.includes("Roblox")) return res.status(200).send(SETTINGS.PLAIN_TEXT_RESP);
    if (blacklist[ip]) return res.status(403).send("BANNED.");

    try {
        if (currentStep > 0) {
            const session = sessions[ip];
            if (!session || session.id !== id || session.nextKey !== key) {
                return res.status(200).send("HANDSHAKE ERROR.");
            }

            const timeDiff = now - session.lastTime;
            if (timeDiff < session.requiredWait) {
                blacklist[ip] = true;
                await sendStealthLog(ip, "BOT_DETECTED", { username: u, executor: e });
                return res.status(403).send("TIMING VIOLATION!");
            }
        }

        // == LOGIC LAYER == \\
        if (currentStep < SETTINGS.TOTAL_LAYERS) {
            const sessionID = id || Math.random().toString(36).substring(2, 12);
            const nextKey = Math.random().toString(36).substring(2, 8);
            const waitTime = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;

            sessions[ip] = { id: sessionID, nextKey: nextKey, lastTime: now, requiredWait: waitTime };

            return res.status(200).send(generateNextLayer(host, currentPath, currentStep + 1, sessionID, nextKey, waitTime));
        }

        // == FINAL STEP == \\
        if (currentStep === SETTINGS.TOTAL_LAYERS) {
            await sendStealthLog(ip, "SUCCESS", { username: u, executor: e });
            delete sessions[ip];
            return res.status(200).send(SETTINGS.REAL_SCRIPT.trim());
        }

    } catch (err) {
        return res.status(500).send("INTERNAL ERROR.");
    }
};
