const SECRET_KEY = "kontol123"; // Ini teks yang akan muncul di Fetcher

function encrypt(text, key) {
    let result = "";
    for (let i = 0; i < text.length; i++) {
        let charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        result += charCode.toString(16).padStart(2, '0');
    }
    return result;
}

module.exports = async (req, res) => {
    const { step, id } = req.query;
    const agent = req.headers['user-agent'] || "";

    if (!agent.includes("Roblox")) {
        return res.status(403).send("Unauthorized.");
    }

    if (step === "final") {
        // 1. Script asli yang mau dijalankan (Damage Darah)
        const luauScript = `game.Players.LocalPlayer.Character.Humanoid:TakeDamage(20)`;

        // 2. Sembunyikan script asli di Header (Format HEX)
        res.setHeader('X-Secret-Data', encrypt(luauScript.trim(), SECRET_KEY));
        
        // 3. Tampilkan teks Secret Key di Body (Inilah yang akan muncul di GUI Fetcher)
        return res.status(200).send(SECRET_KEY);
    }
    
    // Step 1: Handshake (Mengirim loader)
    return res.status(200).send("Handshake logic...");
};
