const fs = require('fs');
let css = fs.readFileSync('app/globals.css', 'utf8');

if (!css.includes('goog-te-banner-frame')) {
  css += `

/* HIDE GOOGLE TRANSLATE BANNER */
iframe.skiptranslate {
  display: none !important;
  visibility: hidden !important;
}
.skiptranslate.goog-te-banner-frame {
  display: none !important;
}
body {
  top: 0px !important; 
  position: relative !important;
}
.VIpgJd-ZVi9od-ORHb-OEVmcd { 
  display: none !important; 
}
#goog-gt-tt { 
  display: none !important; 
}
`;
  fs.writeFileSync('app/globals.css', css);
}
