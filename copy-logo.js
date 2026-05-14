// This script copies the logo to the public folder
const fs = require('fs');
const src = 'c:\\developer\\SiempreMio\\assets\\images\\icon.png';
const dst = 'c:\\developer\\SiempreMio\\lib\\siempre_mio_web\\public\\logo.png';
fs.copyFileSync(src, dst);
console.log('Logo copied successfully to', dst);
