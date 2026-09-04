import fs from 'fs';
import path from 'path';

const KELIN_PLUGINS = '/home/ubuntu/temp-kelin-md2/plugins';
const AKIRA_PLUGINS = '/home/ubuntu/AKIRA-DISCORD/plugins';

const CATEGORIES = fs.readdirSync(KELIN_PLUGINS).filter(f => fs.statSync(path.join(KELIN_PLUGINS, f)).isDirectory());

CATEGORIES.forEach(category => {
    const srcDir = path.join(KELIN_PLUGINS, category);
    const destDir = path.join(AKIRA_PLUGINS, category);
    
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    
    const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.js'));
    
    files.forEach(file => {
        const srcPath = path.join(srcDir, file);
        const destPath = path.join(destDir, file);
        
        let content = fs.readFileSync(srcPath, 'utf8');
        
        // Simple adaptation for Discord-specific needs if any
        // Most logic is handled by the pluginManager's mockSock and compatibilityMessage
        
        fs.writeFileSync(destPath, content);
        console.log(`Ported: ${category}/${file}`);
    });
});
