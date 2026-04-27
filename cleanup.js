import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import * as fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const email = 'yeshivakistra@gmail.com'.toLowerCase();
  const q = query(collection(db, 'staffDirectory'), where('email', '==', email));
  const snaps = await getDocs(q);
  console.log(`Found ${snaps.size} staff records for ${email}`);
  for (const doc of snaps.docs) {
    console.log(`Deleting staff record ${doc.id}`);
    await deleteDoc(doc.ref);
  }
}

run().then(() => console.log('Done')).catch(e => console.error(e));
