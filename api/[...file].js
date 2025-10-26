import fs from 'fs';
import path from 'path';

const VALID_TOKEN = 'HJDBSBCUJJRFMIK2ARAF2W3ZCMRF2C3BFUNWIHTFC4GGUR3MC4FUKUDMCMHGEBSUAEYV4ILKAYWFIH3DFIZQYSCKMJLBWHCSKIMAMYJFBQPQK6ZSEEFBOWR4GAQFM5ZFLNFB2DZEDQ7VSXYTAENBYQYTKVDQI52VM5IR2ULOIVDB6DCJ';

export default function handler(req, res) {
    const fileName = req.query.file ? req.query.file.join('/') : '';
    const authToken = req.query.auth || '';
    
    // Debug: log apa yang diterima (hapus setelah testing)
    console.log('fileName:', fileName);
    console.log('authToken:', authToken);
    console.log('Valid?', authToken === VALID_TOKEN);
    
    // Validasi token
    if (authToken !== VALID_TOKEN) {
        res.setHeader('Content-Type', 'text/plain');
        res.status(404).send('404: Not Found!');
        return;
    }
    
    // Token valid, kirim script
    try {
        const scriptPath = path.join(process.cwd(), 'data', `${fileName}.lua`);
        
        console.log('Trying to read:', scriptPath); // Debug
        
        if (!fs.existsSync(scriptPath)) {
            res.status(404).send('404: Not Found! (File not exist)');
            return;
        }
        
        const scriptContent = fs.readFileSync(scriptPath, 'utf8');
        res.setHeader('Content-Type', 'text/plain');
        res.status(200).send(scriptContent);
    } catch (error) {
        console.error('Error:', error); // Debug
        res.status(404).send('404: Not Found! (Error: ' + error.message + ')');
    }
}
