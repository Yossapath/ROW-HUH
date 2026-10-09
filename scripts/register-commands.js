require("dotenv").config({ path: ".env.local" });

const commands = [
  {
    name: "ลา",
    description: "บันทึกการลากิลวอร์ของสมาชิก (ใช้งานโดยแอดมินหรือตัวผู้เล่นเอง)",
    options: [
      {
        type: 6, // USER type
        name: "user",
        description: "เลือกบุคคลที่ต้องการแจ้งลา (พิมพ์ @ชื่อ)",
        required: true,
      },
      {
        type: 3, // STRING type
        name: "reason",
        description: "เหตุผลที่ลา",
        required: true,
      }
    ]
  },
  {
    name: "เปลี่ยนชื่อ",
    description: "เปลี่ยนชื่อตัวละครในระบบเว็บ (กำลังพัฒนา)",
    options: [
      {
        type: 6,
        name: "user",
        description: "เลือกบุคคลที่ต้องการเปลี่ยนชื่อ (พิมพ์ @ชื่อ)",
        required: true,
      },
      {
        type: 3,
        name: "new_name",
        description: "ชื่อใหม่ที่ต้องการเปลี่ยน",
        required: true,
      }
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
