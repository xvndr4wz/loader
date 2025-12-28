const SECRET_KEY = "KONTOL999"; 

function toHex(text, key) {
    let result = "";
    for (let i = 0; i < text.length; i++) {
        let charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        result += charCode.toString(16).padStart(2, '0');
    }
    return result;
}

module.exports = async (req, res) => {
    const { step, id } = req.query;
    const host = req.headers.host;
    const fullUrl = `https://${host}${req.url.split('?')[0]}`;
    const agent = req.headers['user-agent'] || "";

    // Proteksi User-Agent (Agar tidak bisa dibuka sembarang browser)
    if (!agent.includes("Roblox")) {
        return res.status(403).send("Unauthorized: Use Roblox.");
    }

    // --- STEP 1: Loader ---
    if (!step) {
        const token = Math.random().toString(36).substring(7);
        // Script ini akan dikirim ke executor kamu
        return res.status(200).send(`
            local r = (syn and syn.request) or (http and http.request) or http_request or request
            if not r then return warn("Executor tidak support request!") end

            local url = "${fullUrl}?step=final&id=${token}"
            -- PENTING: Header User-Agent harus disertakan di sini agar tidak kena blokir server
            local res = r({
                Url = url, 
                Method = "GET", 
                Headers = { ["User-Agent"] = "Roblox" } 
            })

            local function decode(hex, k)
                local r = ""
                for i = 1, #hex, 2 do
                    local b = tonumber(hex:sub(i, i+1), 16)
                    if b then
                        r = r .. string.char(bit32.bxor(b, string.byte(k, ((i-1)/2 % #k) + 1)))
                    end
                end
                return r
            end

            -- Mencari header X-Data (case-insensitive)
            local raw = nil
            for k, v in pairs(res.Headers) do
                if k:lower() == "x-data" then raw = v break end
            end

            if raw then
                local s = decode(raw, "${SECRET_KEY}")
                local f = loadstring(s)
                if f then f() end
            else
                warn("Gagal mengambil Payload dari Header!")
            end
        `.trim());
    }

    // --- STEP 2: Final Payload ---
    if (step === "final") {
        const payload = `game.Players.LocalPlayer.Character.Humanoid:TakeDamage(20)`;
        
        // Kita paksa nama header jadi huruf kecil agar konsisten di semua executor
        res.setHeader('x-data', toHex(payload.trim(), SECRET_KEY));
        
        // Hasil yang muncul di GUI Fetcher (Body)
        return res.status(200).send(SECRET_KEY);
    }
};
