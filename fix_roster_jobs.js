const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
envFile.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length > 0) {
    process.env[key.trim()] = values.join('=').trim().replace(/^['"](.*)['"]$/, '');
  }
});
const admin = require('firebase-admin');
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
async function run() {
  const rRef = db.collection('roster').doc('roster');
  const snap = await rRef.get();
  const data = snap.data();
  let rosterData = data.data || data;
  let changed = false;
  
  if (rosterData['Clown']) {
    console.log('Found Clown');
    if (!rosterData['Bard']) rosterData['Bard'] = [];
    rosterData['Bard'] = [...rosterData['Bard'], ...rosterData['Clown']];
    rosterData['Bard'].forEach(m => m.job = 'Bard');
    delete rosterData['Clown'];
    changed = true;
  }
  if (rosterData['Gypsy']) {
    console.log('Found Gypsy');
    if (!rosterData['Dancer']) rosterData['Dancer'] = [];
    rosterData['Dancer'] = [...rosterData['Dancer'], ...rosterData['Gypsy']];
    rosterData['Dancer'].forEach(m => m.job = 'Dancer');
    delete rosterData['Gypsy'];
    changed = true;
  }
  
  let allNames = new Set();
  let duplicates = [];
  for (const job of Object.keys(rosterData)) {
    if (Array.isArray(rosterData[job])) {
      const uniqueMembers = [];
      for (const m of rosterData[job]) {
        if (!allNames.has(m.name)) {
          allNames.add(m.name);
          uniqueMembers.push(m);
        } else {
          duplicates.push(m.name);
        }
      }
      if (uniqueMembers.length !== rosterData[job].length) {
        rosterData[job] = uniqueMembers;
        changed = true;
      }
    }
  }
  console.log('Duplicates removed:', duplicates);
  
  if (changed) {
    await rRef.set(data.data ? { data: rosterData } : rosterData);
    console.log('Migrated successfully.');
  } else {
    console.log('No migration needed.');
  }
  process.exit(0);
}
run();
