const fs = require('fs');
let code = fs.readFileSync('app/layout.tsx', 'utf8');
code = code.replace('import Providers from "./providers";', 'import Providers from "./providers";\nimport { GlobalModal } from "@/components/GlobalModal";');
code = code.replace('<Providers>{children}</Providers>', '<Providers>{children}</Providers>\n        <GlobalModal />');
fs.writeFileSync('app/layout.tsx', code);
console.log("Patched layout");
