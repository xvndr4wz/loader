import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
    const userAgent = req.headers['user-agent'] || '';
    
    // Ambil nama file dari URL
    // URL: /api/invisible → file = ['invisible']
    // URL: /api/esp → file = ['esp']
    const fileName = req.query.file ? req.query.file.join('/') : '';
    
    // Cek apakah request dari Roblox
    if (userAgent.toLowerCase().includes('roblox')) {
        try {
            // Baca file .lua dari folder scripts
            const scriptPath = path.join(process.cwd(), 'scripts', `${fileName}.lua`);
            
            // Cek apakah file exists
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
        // Redirect browser ke link lain
        res.redirect(301, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
        // Atau bisa random redirect berdasarkan fileName
    }
            }
