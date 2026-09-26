import * as admin from "firebase-admin";

let initError = "";

function formatPrivateKey(key: string) {
  if (!key) return "";
  
  // 1. Remove surrounding quotes if they exist
  let cleaned = key.replace(/^["']|["']$/g, "");
  
  // 2. Replace literal '\n' strings with actual newlines
  cleaned = cleaned.replace(/\\n/g, "\n");
  
  // 3. Remove \r
  cleaned = cleaned.replace(/\r/g, "");
  
  // 4. If the key got completely flattened (no newlines at all), reconstruct it
  if (!cleaned.includes("\n")) {
    const beginHeader = "-----BEGIN PRIVATE KEY-----";
    const endHeader = "-----END PRIVATE KEY-----";
    if (cleaned.startsWith(beginHeader) && cleaned.includes(endHeader)) {
      const base64Body = cleaned
        .substring(beginHeader.length, cleaned.indexOf(endHeader))
        .replace(/\s+/g, ""); // Remove any spaces that might have been added
        
      // Reconstruct with proper newlines (split base64 into 64-char lines)
      const formattedBody = base64Body.match(/.{1,64}/g)?.join("\n") || base64Body;
      cleaned = `${beginHeader}\n${formattedBody}\n${endHeader}\n`;
    }
  }
  
  return cleaned.trim();
}

// Lazy initialize Firebase admin
export function getDb() {
  if (!admin.apps.length) {
    // Validate all required environment variables upfront
    const missing: string[] = [];
    if (!process.env.FIREBASE_PROJECT_ID)    missing.push("FIREBASE_PROJECT_ID");
    if (!process.env.FIREBASE_CLIENT_EMAIL)  missing.push("FIREBASE_CLIENT_EMAIL");
    if (!process.env.FIREBASE_PRIVATE_KEY)   missing.push("FIREBASE_PRIVATE_KEY");

    if (missing.length > 0) {
      initError = `Missing required Firebase environment variables: ${missing.join(", ")}. Please set them in .env.local`;
    } else {
      try {
        const formattedKey = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY!);

        admin.initializeApp({
          credential: admin.credential.cert({
            projectId:   process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey:  formattedKey,
          }),
        });
      } catch (error: any) {
        console.error("Firebase admin initialization error:", error);
        initError = error.message || "Unknown Firebase initialization error";
      }
    }
  }

  if (initError) {
    throw new Error("FIREBASE_INIT_ERROR: " + initError);
  }

  return admin.firestore();
}

export const COLL_USER = "topguild-user";
export const COLL_SYSTEM = "topguild-system";
export const COLL_DUN = "topguild-dun";

// System refs
export const rosterRef     = () => getDb().collection(COLL_SYSTEM).doc("roster");
export const teamsRef      = () => getDb().collection(COLL_SYSTEM).doc("teams");
export const attendanceRef = () => getDb().collection(COLL_SYSTEM).doc("attendance");
export const leaveRef      = () => getDb().collection(COLL_SYSTEM).doc("leaves");
export const logsRef       = () => getDb().collection(COLL_SYSTEM).doc("logs");

// Dungeon refs
export const dungeonsRef   = () => getDb().collection(COLL_DUN).doc("dungeons");
export const scheduleRef   = () => getDb().collection(COLL_DUN).doc("dungeon_schedule");

// Auction refs
export const auctionsRef = () => getDb().collection("auctions");
export const auctionReservationsRef = () => getDb().collection("auctionReservations");
