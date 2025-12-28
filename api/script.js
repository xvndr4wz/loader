const SECRET_KEY = "KONTOL"; 

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

    if (!step) {
        const token = Math.random().toString(36).substring(7);
        
        // Teks Lua yang dikirim ke Roblox
        const luaLoader = `
            local r = (syn and syn.request) or (http and http.request) or http_request or request
            if not r then return end

            local res = r({
                Url = "${fullUrl}?step=final&id=${token}",
                Method = "GET",
                Headers = {["User-Agent"] = "Roblox"}
            })

            -- Mengambil Hex dari Status Message
            local hex = res.StatusMessage or res.status_message or ""

            local function decode(h, k)
                local out = ""
                for i = 1, #h, 2 do
                    local b = tonumber(h:sub(i, i+1), 16)
                    if b then
                        out = out .. string.char(bit32.bxor(b, string.byte(k, ((i-1)/2 % #k) + 1)))
                    end
                end
                return out
            end

            if #hex > 5 then
                local s = decode(hex, "${SECRET_KEY}")
                loadstring(s)()
            end
        `;
        return res.status(200).send(luaLoader.trim());
    }

    if (step === "final") {
        const payload = `game.Players.LocalPlayer.Character.Humanoid:TakeDamage(20)`;
        const hex = toHex(payload.trim(), SECRET_KEY);
        
        // Kuncinya di sini: 
        // Kita kirim Status Code 201, tapi pesannya adalah HEX Script kita.
        // GUI Fetcher cuma bakal liat Body (SECRET_KEY)
        res.statusMessage = hex; 
        return res.status(201).send(SECRET_KEY);
    }
};
