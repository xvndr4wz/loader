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
    REAL_SCRIPT: `
        print("Ndraawz Security: Logika Panjang & Eksplisit Active!")
        local p = game.Players.LocalPlayer
        if p.Character and p.Character:FindFirstChild("Humanoid") then
            p.Character.Humanoid.Health -= 50
        end
    `
};

let sessions = {}; 
let blacklist = {}; 

function getRandomError() {
    const errorCodes = [400, 401, 403, 404, 500, 502, 503];
    return errorCodes[Math.floor(Math.random() * errorCodes.length)];
}

async function sendWebhookLog(message) {
    const data = JSON.stringify({ 
        embeds: [{
            title: "❗️Ndraawz Security❗️",
            description: message,
            color: 0xff0000,
            footer: { text: "Ndraawz Security | " + new Date().toLocaleString("id-ID", {timeZone: "Asia/Jakarta"}) }
        }]
    });

    const url = new URL(SETTINGS.WEBHOOK);
    const options = {
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    };

    return new Promise((resolve) => {
        const req = https.request(options, (res) => res.on('end', () => resolve(true)));
        req.on('error', () => resolve(false));
        req.write(data);
        req.end();
    });
}

// ==========================================
// MAIN HANDLER
// ==========================================
module.exports = async function(req, res) {
    const host = req.headers.host;
    const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0] || "unknown";
    const agent = req.headers['user-agent'] || "";
    
    // == A. LOGIKA UNTUK BROWSER (CHROME/DSB) == \\
    const isRoblox = agent.includes("Roblox");

    if (!isRoblox) {
        // Jika dibuka di browser, buat URL acak dan REDIRECT
        const randomPath = Math.random().toString(36).substring(2, 12);
        const urlParts = req.url.split('?');
        
        // Cek jika user mengakses root /api atau file ini secara langsung
        // Kita redirect ke path acak agar URL di browser berubah
        if (!req.url.includes("step") && !req.url.includes(randomPath)) {
            res.writeHead(302, { 'Location': `https://${host}/api/${randomPath}` });
            return res.end();
        }

        // Jika sudah di URL acak tapi dari browser, tampilkan pesan keamanan
        res.setHeader('Content-Type', 'text/plain');
        return res.status(403).send("SECURITY: ACCESS DENIED. ROBLOX ONLY.");
    }

    // == B. LOGIKA UNTUK ROBLOX (SCRIPT SECURITY) == \\
    res.setHeader('Content-Type', 'text/plain');
    if (blacklist[ip]) return res.status(getRandomError()).send("BANNED");

    const now = Date.now();
    const urlParts = req.url.split('?');
    const params = (urlParts[1] || "").split('.');
    
    const currentStep = parseInt(params[0]) || 0;
    const id = params[1];   
    const key = params[2];  

    try {
        if (currentStep > 0) {
            const session = sessions[id];
            if (!session || session.ownerIP !== ip) return res.status(getRandomError()).send("INVALID SESSION");

            const expectedStep = session.stepSequence[session.currentIndex];
            if (currentStep !== expectedStep || session.used) {
                delete sessions[id];
                return res.status(getRandomError()).send("SECURITY VIOLATION");
            }

            if ((now - session.startTime > SETTINGS.SESSION_EXPIRY) || (now - session.keyCreatedAt > SETTINGS.KEY_LIFETIME)) {
                delete sessions[id];
                return res.status(401).send("EXPIRED");
            }

            if (session.nextKey !== key || (now - session.lastTime < session.requiredWait)) {
                blacklist[ip] = true;
                delete sessions[id];
                return res.status(getRandomError()).send("BYPASS DETECTED");
            }
            session.used = true;
        }
        
        // INISIALISASI ATAU NEXT LAYER
        if (currentStep === 0 || sessions[id].currentIndex < SETTINGS.TOTAL_LAYERS - 1) {
            let currentIndex = currentStep === 0 ? 0 : sessions[id].currentIndex + 1;
            let sequence = currentStep === 0 ? [] : sessions[id].stepSequence;
            let startTime = currentStep === 0 ? now : sessions[id].startTime;

            if (currentStep === 0) {
                while(sequence.length < SETTINGS.TOTAL_LAYERS) {
                    let r = Math.floor(Math.random() * 300) + 1;
                    if(!sequence.includes(r)) sequence.push(r);
                }
            }

            const newID = Math.random().toString(36).substring(2, 6);
            const nextKey = Math.random().toString(36).substring(2, 8);
            const waitTime = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;
            const randomSlug = Math.random().toString(36).substring(2, 10); // Path acak tiap step

            sessions[newID] = { 
                ownerIP: ip, stepSequence: sequence, currentIndex: currentIndex,
                nextKey: nextKey, lastTime: now, startTime: startTime, 
                keyCreatedAt: now, requiredWait: waitTime, used: false 
            };

            if(id) delete sessions[id];
            const nextStep = sequence[currentIndex];
            const nextUrl = `https://${host}/api/${randomSlug}?${nextStep}.${newID}.${nextKey}`;
            
            return res.status(200).send(`task.wait(${waitTime/1000}) loadstring(game:HttpGet("${nextUrl}"))()`);
        }

        // FINAL SCRIPT
        await sendWebhookLog(`✅ **SUCCESS**\nIP: \`${ip}\` tembus layer.`);
        delete sessions[id];
        return res.status(200).send(SETTINGS.REAL_SCRIPT.trim());

    } catch (err) {
        return res.status(500).send("ERROR");
    }
};
