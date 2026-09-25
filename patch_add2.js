const fs = require('fs');
let code = fs.readFileSync('components/auction/AddAuctionModal.tsx', 'utf8');

// Use Regex to replace the image input block
const regex = /<div>\s*<label[^>]*>\s*Image URL \(Optional\)\s*<\/label>\s*<input[^>]*imageUrl[^>]*>\s*<\/div>/g;

const newImageInput = `<div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              รูปภาพไอเทม
            </label>
            <div className="flex items-start gap-4 mb-4">
              <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-[#2D3342] border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                {imageUrl ? (
                  <img src={imageUrl} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="text-slate-400" size={24} />
                )}
              </div>
              <div className="flex-1">
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-[#232733] border border-slate-200 dark:border-[#2D3342] hover:bg-slate-200 dark:hover:bg-[#2A2F3E] text-slate-700 dark:text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                >
                  {isUploading ? <RefreshCw className="animate-spin" size={16} /> : <Upload size={16} />}
                  {imageUrl ? "เปลี่ยนรูปภาพ" : "อัปโหลดรูปภาพ"}
                </button>
                <p className="text-[10px] text-slate-500 mt-2">รองรับ PNG, JPG ขนาดไม่เกิน 2MB</p>
              </div>
            </div>
          </div>`;

code = code.replace(regex, newImageInput);
fs.writeFileSync('components/auction/AddAuctionModal.tsx', code);
console.log("Patched!");
