const fs = require('fs');
let code = fs.readFileSync('components/auction/AuctionQueuesView.tsx', 'utf8');

const target = 'copyText += `@${q.characterName} [Queue ${qIdx + 1}]\\n`;';
const replace = 'copyText += `@${q.discordUsername || q.characterName} [${q.characterName}] [Queue ${qIdx + 1}]\\n`;';

code = code.replace(target, replace);
fs.writeFileSync('components/auction/AuctionQueuesView.tsx', code);
