import admin from "firebase-admin";

// ── Firebase init ──────────────────────────────────────────────
const privateKey = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC5ao5laXvLzCGB
SsoHgCQFUoh2LZ0O76SiDon1eI/Atmm7QsFv8xxzhHFzypt2r4capHH6CrS9bI/D
KotCwx4Dx5uUHKpmyXiZzxtGVG1PGE4ReZ23iD7pZPmRoby4lSS2fPA0WnRB6Nq4
Lr/ddKseKVj5viGnVRjeuSlV/SALOYawU5X7+Z/802pTcmFfwmAFpPdkRhgieiBg
Hl/YSzQNqcUNTgLPf07a7nf/q3IQwqjAwXLOiB2tpXIAp9WgqxWVp5wEKunp1lGW
wB4NFqUq56GB7rM2yi3QyTXlNpQ6c6xxh6TrZf4GF/9deeRG163m+0qWIGxNR3pM
KVmlHD5/AgMBAAECggEANp1UZDq15Em0dMj6yUrNUWQGHglBgezEqZduu4dPkIwq
iKYZJEiP0NbqNBkxwbviJ87YY7ZTlpgroGkfrAKdDK/2+6GV78DYbTW76vNjXzDh
jfQsqKrRHR5JBMSHOjd0IOycNE+Qfvl/s1DR4wFChhfXxXhjoU5HjRMtQc7VaXh/
dNpPBqVYoSGo2G/4yhbb1aPYb4cMpEyhTeexoMAxlxn9ISuHqXUp+t+rqyoeROUD
LyNXkwiJzKnozI7PWAWQt5o/leZWn5KmWExDBsrM10eS4mi15f0Je4jNENqWQP1k
2uOVQW6/zEvt/XNwpDujQSvQqwNVToVlocuJavZowQKBgQDvEcBqscQ8WRzqI2MI
4HgLpyX6T6xJIr+SskrbPhpwPTRUhnGr4L6NTM1Bliy4+Y+VYaED8MfofjBagkrJ
mjSeH5CFqhCCtr5e2omoZYtQjvYy+AKwisWdIpFDY9I2wIqNxRWzSj6t+dgn64pf
XvOB5HP17VRdDN67C7kIpWFQWwKBgQDGjBdqFWw/lqIa15GBGmbKLXxcn+gMmA9a
S/8FmrJg1v0uY7xJ7Frcttjgi8rFn2DM3xfbUFQkWpZwNPP20oTHfgH8W4KGhkC3
Eol8TDpViVGFvyHmrlAcE+40lCzI5mT1MBl2EmgeWz0NiJ7O9l6Atq9oue5Ss5bX
jrgZG72jrQKBgQDdXrWq1lLcgrPIht30YU4nlC4Re2cQDdIQt3GjU/1NQw9K2Xc2
bZRk6OIDQljFK6lt7IoZSQMDYJ3LoWw5A8aHSLkdXB2PvEHJOVlQij6XaNnG1mo/
KTDVUSXrneoQcveZUQ7IBw7FMF2ckXl+2EBpXa6W4Z1F0F4KG0/KFsFmkwKBgC2E
EBoRry8kqSTeJk0icE4I/2l8fwXkFiDtKxltzVbF8mSgGJoZxPq0MCPJ6EJFtztA
KYftclyjJ7mxafw7ZpUVHf9sOw/71vohFcOY9gaF5Fp05qCrdVH6f7EuBtZHev16
eVvH/HZ5FBX2K/HmKOP4/V1Uwn3TDdF8tleLNH5BAoGAO2SevLc/KdNVw+tcKNj/
yK3g5uPtTn5YsOaVrTAVXq9MvACwaIZnA1UEXcdslDqfIYo7GWMC119f4B2ilm10
ieOtJI9XczLMeZYIVWX2c0VLr8mhVqJpyxerMoaW/MQHCr8nVamPM7/KuEflXxR/
tqmpNYM4pwOhbnqGvqQYYcE=
-----END PRIVATE KEY-----
`;

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: "row-topguild",
    clientEmail: "firebase-adminsdk-fbsvc@row-topguild.iam.gserviceaccount.com",
    privateKey,
  }),
});

const db = admin.firestore();

// ── รายชื่อ 144 คน ─────────────────────────────────────────────
const inputList = [
  "TELLツ", "TopGameTH", "พ่องมีไต", "Avalon", "Baki_Hanma",
  "กระดุมเม็ดบน", "มัมจู", "JossGoose", "`P1CaszO", "I'm18",
  "บุญช่วย", "Razer", "Luxferre", "mosmosxso", "หวานเจี๊ยฟ",
  "บักตุ่น", "หล่อซิแหล่", "12ED!TUS", "Cal2nivaLxD", "`RMS",
  "โอ๊ยยร้อนน", "navanavin", "uwannadie", "Nub", "DOMONCUS",
  "รีลีส", "ขุนทวนสวนทวาร", "SiLeNcE", "GOLF", "Over_Topup",
  "MaLo", "Zerion", "SappeXo", "[mochi]", "zzzTOzzz",
  "'5263", "กระดานชนวน", "LoserX", "คุคุคุ", "เวลดอล่า",
  "หวังสี้เจ้า", "หยองแยง", "Ppreaw", "Atomic", "Wattana",
  "Yami", "XtremeDash", "3ararentz", "Pepzii2", "IssyWitchy",
  "Mahnow", "AxAxAxAx", "Darktrick", "ยาซป", "หนูอึดนะพี่ไหวหรอ",
  "Homey", "MIMIMI-", "DARKCAFE", "cHk", "JeedsJard",
  "Wenuzzent", "Almonso", "Ms,08", "Weedsp", "อุยุอายะ",
  "PUPPA", "TheNinez", "Tenten", "BixDix", "ppiimm",
  "l3eE", "Mahlakor", "อามะ-ภันเต", "-Protector-", "MaKaLiTa",
  "xTRUMPx", "-'PTiBull'-", "BUNGEEGUM", "Non79", "CGame",
  "Torpedoo", "fluffi_cia", "SinsamutSaGa", "Uhtred", "ตะขบ",
  "ชาวประมง", "Aramid", "P9D", "บีบังกวย", "XxerrosS",
  "ร้องขอชีวิต", "Peamkr", "Vaduka-Tampan", "Zendo", "DouI3LeP",
  "aoftuiiduii", "หนานแดง", "ฟหกด", "LastLouis", "Pairot_1995",
  "SK-Noom", "LinPing", "M4A1", "Keith", "PATEK5712",
  "หรรมน้อยแซงเลย", "HyPerTo", "FishStop", "AzujiKung", "Demons",
  "กุเอง", "NpR_n", "NaoKi", "พี่ธีร์", "Bomberboyz",
  "Maboom", "FangKhao", "Katoonz", "spkn", "Fujiro",
  "banana1fruit", "โชคอำนวย", "MasterClover", "Satanic", "BoyKub",
  "SAFEZONE", "NaTzo", "Orasa", "YuGi", "KiMuJi",
  "Flexx", "Lorying", "Moji_Cheese", "imQwQm", "oONIo",
  "McRai", "McLai", "monza", "DMTz", "น้oงxoe",
  "OTANI", "ironboy69", "ปลาหมอสีเหลือง", "InseptiOn"
];

async function main() {
  console.log("📡 กำลังดึงข้อมูล roster จาก Firestore...\n");

  // ── ดึง roster (job class → members[]) ────────────────────────
  const rosterDoc = await db.collection("topguild-system").doc("roster").get();
  let rosterData = {};
  if (rosterDoc.exists) {
    const raw = rosterDoc.data();
    rosterData = raw?.data ? raw.data : raw;
  }

  // รวมชื่อทั้งหมดใน roster
  const rosterNames = new Set();
  for (const [job, members] of Object.entries(rosterData)) {
    if (Array.isArray(members)) {
      for (const m of members) {
        if (m?.name) rosterNames.add(m.name.trim());
      }
    }
  }

  // ── ดึง users collection ────────────────────────────────────
  const usersSnap = await db.collection("topguild-user").get();
  const userNames = new Set();
  const userGameNames = new Set();
  usersSnap.forEach(doc => {
    const d = doc.data();
    if (d?.discordUsername) userNames.add(d.discordUsername.trim());
    if (d?.gameUsername) userGameNames.add(d.gameUsername.trim());
  });

  // normalize: lowercase + strip zero-width chars + trim
  const normalize = (s) => s
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, "") // zero-width
    .replace(/\u200B/g, "")
    .trim()
    .toLowerCase();

  // Build case-insensitive lookup map: normalized → original DB name
  const dbNameMap = new Map(); // normalized → original
  for (const n of rosterNames)    dbNameMap.set(normalize(n), n);
  for (const n of userNames)      dbNameMap.set(normalize(n), n);
  for (const n of userGameNames)  dbNameMap.set(normalize(n), n);

  console.log(`✅ Roster names (${rosterNames.size}):`, [...rosterNames].join(", "), "\n");
  console.log(`✅ Discord usernames (${userNames.size}):`, [...userNames].join(", "), "\n");
  console.log(`✅ Game usernames (${userGameNames.size}):`, [...userGameNames].join(", "), "\n");
  console.log("─".repeat(60));

  // ── เปรียบเทียบ ────────────────────────────────────────────────
  const missing = [];
  const found = [];

  for (const name of inputList) {
    const key = normalize(name);
    if (dbNameMap.has(key)) {
      found.push({ input: name, db: dbNameMap.get(key) });
    } else {
      missing.push(name);
    }
  }

  console.log(`\n🟢 พบในฐานข้อมูล (${found.length} คน):`);
  found.forEach((n, i) => {
    const match = n.input === n.db ? n.input : `${n.input}  ← DB: "${n.db}"`;
    console.log(`  ${i + 1}. ${match}`);
  });

  console.log(`\n🔴 ไม่พบในฐานข้อมูล (${missing.length} คน):`);
  missing.forEach((n, i) => console.log(`  ${i + 1}. ${n}`));

  process.exit(0);
}

main().catch(e => { console.error("❌ Error:", e.message); process.exit(1); });
