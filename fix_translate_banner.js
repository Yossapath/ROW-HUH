const fs = require('fs');
let data = fs.readFileSync('components/GoogleTranslate.tsx', 'utf8');

data = data.replace(
  '        .skiptranslate > iframe.goog-te-banner-frame { display: none !important; }',
  '        .skiptranslate > iframe.goog-te-banner-frame { display: none !important; }\n        iframe.skiptranslate { display: none !important; }\n        .VIpgJd-ZVi9od-ORHb-OEVmcd { display: none !important; }\n        #goog-gt-tt { display: none !important; }'
);

data = data.replace(
  'body { top: 0px !important; position: relative !important; }',
  'body { top: 0px !important; position: relative !important; min-height: 100vh !important; }'
);

fs.writeFileSync('components/GoogleTranslate.tsx', data);
