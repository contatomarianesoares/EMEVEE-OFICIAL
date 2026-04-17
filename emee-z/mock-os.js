const os = require('os');
const originalRelease = os.release;
os.release = () => '10.15.7';
console.log('[Emee-Z] Kernel Oracle mascarado para macOS 10.15.7 com sucesso.');
