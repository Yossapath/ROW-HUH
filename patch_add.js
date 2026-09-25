const fs = require('fs');
let code = fs.readFileSync('components/auction/AddAuctionModal.tsx', 'utf8');

if (!code.includes('Upload') && !code.includes('ImageIcon')) {
  code = code.replace(
    'import { X, RefreshCw } from "lucide-react";',
    'import { X, RefreshCw, Upload, Image as ImageIcon } from "lucide-react";\nimport { useRef } from "react";'
  );
}

if (!code.includes('isUploading')) {
  code = code.replace(
    'const [imageUrl, setImageUrl] = useState("");',
    'const [imageUrl, setImageUrl] = useState("");\n  const [isUploading, setIsUploading] = useState(false);\n  const fileInputRef = useRef<HTMLInputElement>(null);\n\n  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {\n    const file = e.target.files?.[0];\n    if (!file) return;\n    if (!file.type.startsWith("image/")) {\n      alert("กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น (png, jpg)");\n      return;\n    }\n    if (file.size > 2 * 1024 * 1024) {\n      alert("ขนาดรูปภาพต้องไม่เกิน 2MB");\n      return;\n    }\n    setIsUploading(true);\n    const reader = new FileReader();\n    reader.onload = (ev) => {\n      const base64 = ev.target?.result as string;\n      setImageUrl(base64);\n      setIsUploading(false);\n    };\n    reader.readAsDataURL(file);\n  };'
  );
}

const oldImageInput = `<div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                Image URL (Optional)
              </label>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://... "
                className="w-full px-4 py-2 mb-4 bg-slate-50 dark:bg-[#232733] border border-slate-200 dark:border-[#2D3342] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B66D1] text-slate-800 dark:text-white"
              />
            </div>`;
            
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

code = code.replace(oldImageInput, newImageInput);
fs.writeFileSync('components/auction/AddAuctionModal.tsx', code);
