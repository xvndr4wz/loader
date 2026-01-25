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
    PLAIN_TEXT_RESP: "APA NYE?", // Teks yang muncul di browser
    REAL_SCRIPT: `
        -- SCRIPT ASLI ANDA
        print("Ndraawz Security: Ultra Fast Randomizer Active!")
        local p = game.Players.LocalPlayer
        if p.Character and p.Character:FindFirstChild("Humanoid") then
            p.Character.Humanoid.Health -= 50
        end
    `
};

let sessions = {}; 
let blacklist = {}; 

function generateComplexID(length) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789~_-";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

async function sendWebhookLog(message) {
    const data = JSON.stringify({ 
        embeds: [{
            title: "❗️Ndraawz Security❗️",
            description: message,
            color: 0xff0000,
            footer: { text: "Ndraawz Security | WIB: " + new Date().toLocaleString("id-ID") }
        }]
    });
    const url = new URL(SETTINGS.WEBHOOK);
    const options = {
        hostname: url.hostname, path: url.pathname, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    };
    return new Promise((resolve) => {
        const req = https.request(options, (res) => {
            res.on('end', () => resolve(true));
        });
        req.on('error', () => resolve(false));
        req.write(data); req.end();
    });
}

module.exports = async function(req, res) {
    const now = Date.now();
    const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0] || "unknown";
    const agent = req.headers['user-agent'] || "";
    const host = req.headers.host;

    const urlParts = req.url.split('?');
    const currentPath = urlParts[0];
    const queryString = urlParts[1] || "";
    const params = queryString.split('.');
    
    const step = params[0]; 
    const id = params[1];   
    const key = params[2];  
    const currentStep = parseInt(step) || 0;

    const isRoblox = agent.includes("Roblox") && (req.headers['roblox-id'] || req.headers['x-roblox-place-id'] || agent.includes("RobloxApp"));

    // == LOGIKA ULTRA FAST RANDOMIZER (UNTUK CHROME) == \\
    if (!isRoblox && currentStep === 0) {
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(`
            <!DOCTYPE html>
            <html>
            <body style="background:#fff; color:#000; font-family:monospace; margin:20px;">
                <pre style="word-wrap: break-word; white-space: pre-wrap;">${SETTINGS.PLAIN_TEXT_RESP}</pre>
                <script>
                    function g(l){
                        let c="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789~_-";
                        let r=""; for(let i=0;i<l;i++) r+=c.charAt(Math.floor(Math.random()*c.length));
                        return r;
                    }
                    // Speed 0ms (Menggunakan requestAnimationFrame agar secepat mungkin)
                    function update(){
                        const s = Math.floor(Math.random()*999);
                        const i = g(8);
                        const k = g(15);
                        window.history.replaceState(null, "", window.location.pathname + "?" + s + "." + i + "." + k);
                        requestAnimationFrame(update);
                    }
                    update();
                </script>
            </body>
            </html>
        `);
    }

    // == GATEKEEPER == \\
    if (!isRoblox || blacklist[ip]) return res.status(403).send("BANNED");

    try {
        if (currentStep > 0) {
            const session = sessions[id];
            if (!session || session.ownerIP !== ip || currentStep !== session.stepSequence[session.currentIndex] || session.nextKey !== key) {
                return res.status(403).send("INVALID");
            }
            if (session.used) {
                blacklist[ip] = true;
                await sendWebhookLog("🚫 **REPLAY**\\n**IP:** \`" + ip + "\` mencoba akses ulang.");
                return res.status(403).send("EXPIRED");
            }
            if (now - session.lastTime < session.requiredWait) {
                blacklist[ip] = true;
                await sendWebhookLog("🚫 **BOT**\\n**IP:** \`" + ip + "\` too fast.");
                return res.status(403).send("LOW_WAIT");
            }
            session.used = true;
        }
        
        if (currentStep === 0 || (sessions[id] && sessions[id].currentIndex < SETTINGS.TOTAL_LAYERS - 1)) {
            let sequence, currentIndex, startTime;
            if (currentStep === 0) {
                sequence = [];
                while(sequence.length < SETTINGS.TOTAL_LAYERS) {
                    let r = Math.floor(Math.random() * 300) + 1;
                    if(!sequence.includes(r)) sequence.push(r);
                }
                currentIndex = 0;
                startTime = now;
            } else {
                sequence = sessions[id].stepSequence;
                currentIndex = sessions[id].currentIndex + 1;
                startTime = sessions[id].startTime;
                delete sessions[id]; 
            }

            const newID = generateComplexID(8);
            const nextKey = generateComplexID(12);
            const waitTime = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;

            sessions[newID] = { 
                ownerIP: ip, stepSequence: sequence, currentIndex: currentIndex,
                nextKey: nextKey, lastTime: now, startTime: startTime, keyCreatedAt: now, 
                requiredWait: waitTime, used: false 
            };

            const nextUrl = "https://" + host + currentPath + "?" + sequence[currentIndex] + "." + newID + "." + nextKey;
            res.setHeader('Content-Type', 'text/plain');
            return res.status(200).send("task.wait(" + (waitTime / 1000) + ") loadstring(game:HttpGet(\"" + nextUrl + "\"))()");
        }

        if (sessions[id].currentIndex === SETTINGS.TOTAL_LAYERS - 1) {
            await sendWebhookLog("✅ **SUCCESS**\\n**IP:** \`" + ip + "\` tembus.");
            delete sessions[id];
            res.setHeader('Content-Type', 'text/plain');
            return res.status(200).send(SETTINGS.REAL_SCRIPT.trim());
        }
    } catch (err) { return res.status(500).send("ERROR"); }
};
