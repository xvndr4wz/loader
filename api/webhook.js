const crypto = require('crypto');

const GITHUB_SECRET = 'NDRAAWZ12341EZ';  // ganti sesuai secret di GitHub
const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5'; // ganti dengan URL Discord BARU

export default async function handler(req, res) {
    // Cuma terima POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Ambil signature dari header GitHub
    const signature = req.headers['x-hub-signature-256'];
    if (!signature) {
        return res.status(401).json({ error: 'Not allowed - no signature' });
    }

    // Verifikasi signature
    const rawBody = JSON.stringify(req.body);
    const hmac = crypto.createHmac('sha256', GITHUB_SECRET);
    const digest = hmac.update(rawBody, 'utf8').digest('hex');
    const expectedSignature = `sha256=${digest}`;

    if (signature !== expectedSignature) {
        return res.status(401).json({ error: 'Not allowed - invalid signature' });
    }

    // ===== SIGNATURE VALID, kirim ke Discord =====
    const event = req.headers['x-github-event'];
    const repo = req.body.repository?.full_name || 'unknown';
    const sender = req.body.sender?.login || 'unknown';

    let message = '';
    if (event === 'push') {
        const commits = req.body.commits?.length || 0;
        message = `📦 **Push ke ${repo}**\n👤 ${sender}\n📝 ${commits} commit baru`;
    } else {
        message = `🔔 **${event}** di ${repo} oleh ${sender}`;
    }

    try {
        await fetch(DISCORD_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: message })
        });
    } catch (err) {
        console.error('Discord error:', err.message);
    }

    res.status(200).json({ success: true });
}
