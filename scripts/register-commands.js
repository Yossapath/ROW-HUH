const commands = [
  // --- THAI COMMANDS ---
  {
    name: "ลา",
    description: "บันทึกการลากิลวอร์ของสมาชิก",
    options: [
      { type: 6, name: "user", description: "เลือกบุคคลที่ต้องการแจ้งลา (พิมพ์ @ชื่อ)", required: true },
      { type: 3, name: "วันลา", description: "วันที่ต้องการลา (เช่น 15/10 หรือ 2026-10-15)", required: true },
      { type: 3, name: "reason", description: "เหตุผลที่ลา", required: true }
    ]
  },
  {
    name: "เปลี่ยนชื่อ",
    description: "เปลี่ยนชื่อตัวละครในระบบเว็บ",
    options: [
      { type: 6, name: "user", description: "เลือกบุคคลที่ต้องการเปลี่ยนชื่อ (พิมพ์ @ชื่อ)", required: true },
      { type: 3, name: "ชื่อใหม่", description: "ชื่อใหม่ที่ต้องการเปลี่ยน", required: true }
    ]
  },
  // --- ENGLISH COMMANDS ---
  {
    name: "leave",
    description: "Submit a leave request for GVG",
    options: [
      { type: 6, name: "user", description: "Select the user to put on leave (@name)", required: true },
      { type: 3, name: "date", description: "Date of leave (e.g., 15/10 or 2026-10-15)", required: true },
      { type: 3, name: "reason", description: "Reason for leave", required: true }
    ]
  },
  {
    name: "changename",
    description: "Change character name in the web system",
    options: [
      { type: 6, name: "user", description: "Select the user (@name)", required: true },
      { type: 3, name: "newname", description: "New character name", required: true }
    ]
  }
];

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;

if (!token || !clientId) {
  console.error("Missing DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID in .env.local");
  process.exit(1);
}

const url = `https://discord.com/api/v10/applications/${clientId}/commands`;

fetch(url, {
  method: "PUT",
  headers: {
    "Authorization": `Bot ${token}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(commands)
})
.then(res => res.json())
.then(data => {
  if (data.errors) {
    console.error("Error registering commands:", JSON.stringify(data.errors, null, 2));
  } else {
    console.log("Successfully registered slash commands:");
    console.log(data.map(c => `/${c.name}`).join("\n"));
  }
})
.catch(err => console.error(err));
