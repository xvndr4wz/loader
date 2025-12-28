const SECRET_KEY = "ZiFi_Secure_99"; 

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

    // STEP 1: Loader Utama
    if (!step) {
        const token = Math.random().toString(36).substring(7);
        // Mengirim Loader yang mendukung fungsi request standar executor
        return res.status(200).send(`
            local req = (syn and syn.request) or (http and http.request) or http_request or request
            if not req then return warn("Executor tidak mendukung 'request' function!") end

            local url = "${fullUrl}?step=final&id=${token}"
            local res = req({Url = url, Method = "GET"})

            local function decode(hex, k)
                local r = ""
                for i = 1, #hex, 2 do
                    local b = tonumber(hex:sub(i, i+1), 16)
                    r = r .. string.char(bit32.bxor(b, string.byte(k, ((i-1)/2 % #k) + 1)))
                end
                return r
            end

            if res.Headers["X-Data"] then
                loadstring(decode(res.Headers["X-Data"], "${SECRET_KEY}"))()
            end
        `.trim());
    }

    // STEP 2: Payload (Hanya dikirim lewat Header)
    if (step === "final") {
        const payload = `game.Players.LocalPlayer.Character.Humanoid:TakeDamage(20)`;
        
        // Sembunyikan di Header
        res.setHeader('X-Data', toHex(payload.trim(), SECRET_KEY));
        
        // Di layar (Body) cuma muncul teks Secret Key buat nipu Fetcher
        return res.status(200).send(SECRET_KEY);
    }
};
