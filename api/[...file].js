import fs from 'fs';
import path from 'path';

// Token rahasia (atau pakai environment variable)
const VALID_TOKEN = 'HJDBSBCUJJRFMIK2ARAF2W3ZCMRF2C3BFUNWIHTFC4GGUR3MC4FUKUDMCMHGEBSUAEYV4ILKAYWFIH3DFIZQYSCKMJLBWHCSKIMAMYJFBQPQK6ZSEEFBOWR4GAQFM5ZFLNFB2DZEDQ7VSXYTAENBYQYTKVDQI52VM5IR2ULOIVDB6DCJ';

export default function handler(req, res) {
    const fileName = req.query.file ? req.query.file.join('/') : '';
    const authToken = req.query.auth || '';
    
    // Validasi token
    if (authToken !== VALID_TOKEN) {
        res.setHeader('Content-Type', 'text/plain');
        res.status(404).send('404: Not Found!');
        return;
    }
    
    // Token valid, kirim script
    try {
        const scriptPath = path.join(process.cwd(), 'data', `${fileName}.lua`);
        
        if (!fs.existsSync(scriptPath)) {
            res.status(404).send('404: Not Found!');
            return;
        }
        
        const scriptContent = fs.readFileSync(scriptPath, 'utf8');
        res.setHeader('Content-Type', 'text/plain');
        res.status(200).send(scriptContent);
    } catch (error) {
        res.status(404).send('404: Not Found!');
    }
}
