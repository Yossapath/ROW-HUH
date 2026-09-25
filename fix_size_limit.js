const fs = require('fs');

function fixSizeLimit(file) {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(/file\.size > [\d\.]+ \* 1024 \* 1024/g, 'file.size > 700 * 1024');
  code = code.replace(/ไม่เกิน 1\.5MB/g, 'ไม่เกิน 700KB');
  code = code.replace(/ไม่เกิน 2MB/g, 'ไม่เกิน 700KB');
  code = code.replace(/สูงสุด 2MB/g, 'สูงสุด 700KB');
  code = code.replace(/สูงสุด 1\.5MB/g, 'สูงสุด 700KB');
  fs.writeFileSync(file, code);
  console.log("Fixed size limit in " + file);
}

fixSizeLimit('components/auction/AddAuctionModal.tsx');
fixSizeLimit('components/auction/EditAuctionModal.tsx');
