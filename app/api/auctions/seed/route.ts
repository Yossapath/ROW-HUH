export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/firebase-admin";

const GEARS = [
  "Bradium Brooch", "Cold_Heart", "Eye of Dullahan", "Flower Ring",
  "Golden Bell", "Kind Heart", "Morriganes_Belt", "Morriganes_Pendant",
  "Nile Rose", "Orleans's Necklace", "Orleanss_Glove", "Rogues_Treasure",
  "Safety Ring", "Scream_Ring"
];

const CARDS = [
  "maya Angeling Card", "maya Dracula Card", "maya Goblin Leader Card",
  "maya Mistress Card", "maya Orc Hero Card", "maya Orc Lord Card",
  "maya Osiris Card", "maya Phreeoni Card"
];

const RELICS = [
  { name: "ลำแสงทำลาย", file: "Blade_of_Destruction" },
  { name: "ทิพัตชัย", file: "Radiant_Holy_Shield" }
];

const STATS = ["INT+10", "AGI+10", "DEX+10", "STR+10", "VIT+10"];

export async function GET() {
  try {
    // 1. Authenticate & authorize before touching Firestore
    const auth = await requireAdmin();
    if (auth.errorResponse) return auth.errorResponse;

    // 2. Initialize Firestore — throws FIREBASE_INIT_ERROR if env vars are missing
    let db;
    try {
      db = getDb();
    } catch (firebaseError: any) {
      console.error("Seed route: Firebase init failed:", firebaseError.message);
      return NextResponse.json(
        { success: false, error: "Firebase configuration error. Check server environment variables." },
        { status: 503 }
      );
    }

    // 3. Build and commit batch
    const auctionsColl = db.collection("auctions");
    const batch = db.batch();
    const now = Date.now();
    let count = 0;

    // Add Gears
    for (const gear of GEARS) {
      batch.set(auctionsColl.doc(), {
        itemName: gear.replace(/_/g, " "),
        category: "gear",
        imageUrl: `/images/auctions/${gear}.png`,
        status: "open",
        queueCount: 0,
        createdAt: now,
        createdBy: "System Seed",
        updatedAt: now,
      });
      count++;
    }

    // Add Cards
    for (const card of CARDS) {
      batch.set(auctionsColl.doc(), {
        itemName: card.replace(/_/g, " "),
        category: "card",
        imageUrl: `/images/auctions/${card}.png`,
        status: "open",
        queueCount: 0,
        createdAt: now,
        createdBy: "System Seed",
        updatedAt: now,
      });
      count++;
    }

    // Add Relics
    for (const relic of RELICS) {
      for (const stat of STATS) {
        batch.set(auctionsColl.doc(), {
          itemName: `${relic.name} (${stat})`,
          category: "relic",
          imageUrl: `/images/auctions/${relic.file}.png`,
          status: "open",
          queueCount: 0,
          createdAt: now,
          createdBy: "System Seed",
          updatedAt: now,
        });
        count++;
      }
    }

    await batch.commit();

    return NextResponse.json({ success: true, count });
  } catch (error: any) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
