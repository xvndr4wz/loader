import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
    const userAgent = req.headers['user-agent'] || '';
    const fileName = req.query.file ? req.query.file.join('/') : '';
    
    // Cek apakah request dari Roblox
    if (userAgent.toLowerCase().includes('roblox')) {
        try {
            // Baca file .lua dari folder api (folder yang sama)
            const scriptPath = path.join(process.cwd(), 'api', `${fileName}.lua`);
            
            if (!fs.existsSync(scriptPath)) {
                res.status(404).send('-- Script not found');
                return;
            }
            
            const scriptContent = fs.readFileSync(scriptPath, 'utf8');
            
            res.setHeader('Content-Type', 'text/plain');
            res.status(200).send(scriptContent);
        } catch (error) {
            res.status(500).send('-- Error loading script');
        }
    } else {
        // Redirect browser
        res.redirect(301, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    }
}
