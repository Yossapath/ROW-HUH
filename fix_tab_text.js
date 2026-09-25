const fs = require('fs');
let data = fs.readFileSync('app/dashboard/auction/page.tsx', 'utf8');

data = data.replace(
  '>\n            ดูคิว\n          </button>',
  '>\n            ดูคิวทั้งหมด\n          </button>'
);

fs.writeFileSync('app/dashboard/auction/page.tsx', data);
console.log('Fixed tab text');
