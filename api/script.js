const SECRET_KEY = "Kontol99"; 

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
        return res.status(200).send(`
            local r = (syn and syn.request) or (http and http.request) or http_request or request
            if not r then return warn("Executor not supported!") end

            local res = r({Url = "${fullUrl}?step=final&id=${token}", Method = "GET"})
            
            -- Cari header X-Data tanpa peduli huruf besar/kecil
            local raw = nil
            for k, v in pairs(res.Headers) do
                if k:lower() == "x-data" then
                    raw = v
                    break
                end
            end

            local function dec(h, k)
                local res = ""
                for i = 1, #h, 2 do
                    local b = tonumber(h:sub(i, i+1), 16)
                    if b then
                        res = res .. string.char(bit32.bxor(b, string.byte(k, ((i-1)/2 % #k) + 1)))
                    end
                end
                return res
            end

            if raw then
                local s = dec(raw, "${SECRET_KEY}")
                local f, err = loadstring(s)
                if f then f() else warn("Load Error: "..err) end
            else
                warn("Data not found in Headers!")
            end
        `.trim());
    }

    if (step === "final") {
        const payload = `print("Script Berhasil!"); game.Players.LocalPlayer.Character.Humanoid:TakeDamage(20)`;
        res.setHeader('X-Data', toHex(payload.trim(), SECRET_KEY));
        return res.status(200).send(SECRET_KEY);
    }
};
