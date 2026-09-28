const fs = require('fs');

// 1. Fix fetch api issue (done in previous script but we will rewrite handleAnnounce to handle empty responses just in case)
let qv = fs.readFileSync('components/auction/AuctionQueuesView.tsx', 'utf8');

qv = qv.replace('const data = await res.json();', 'const text = await res.text();\n      const data = text ? JSON.parse(text) : {};');

// 2. Fix nested buttons (Parent button -> div)
const btnTarget = `            {(filteredAuctions || []).map(auction => (
              <button`;
const btnReplace = `            {(filteredAuctions || []).map(auction => (
              <div
                role="button"
                tabIndex={0}`;
qv = qv.replace(btnTarget, btnReplace);

const endBtnTarget = `                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>`;
const endBtnReplace = `                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>`;
qv = qv.replace(endBtnTarget, endBtnReplace);

fs.writeFileSync('components/auction/AuctionQueuesView.tsx', qv);
