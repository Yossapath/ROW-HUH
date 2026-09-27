import { requireAdmin } from "@/lib/auth";
import { err, ok, handleServerError, logAction } from "@/lib/server-utils";
import { getAuctions } from "@/lib/auction/auctions";
import { getAuctionQueue } from "@/lib/auction/reservations";

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.errorResponse) return auth.errorResponse;

    const webhookUrl = process.env.DISCORD_AUCTION_WEBHOOK_URL;
    if (!webhookUrl) {
      return err("ยังไม่ได้ตั้งค่า Webhook URL ในระบบ (DISCORD_AUCTION_WEBHOOK_URL)", 400);
    }

    const body = await request.json();
    const { auctionIds } = body;

    if (!auctionIds || !Array.isArray(auctionIds) || auctionIds.length === 0) {
      return err("กรุณาเลือกไอเทมอย่างน้อย 1 รายการ", 400);
    }

    const allAuctions = await getAuctions();
    
    // Process items in chunks or all at once? 
    // We will build one large text payload or multiple embeds.
    // Discord message limit is 2000 chars, so let's use Embeds for better formatting.
    const embeds = [];
    
    for (const id of auctionIds) {
      const auction = allAuctions.find(a => a.id === id);
      if (!auction) continue;

      const queue = await getAuctionQueue(id);
      const waiting = queue.filter(q => q.status === "waiting");
      
      if (waiting.length === 0) continue;

      let desc = "";
      waiting.forEach((q, idx) => {
        desc += `> <@${q.userId}> [Queue ${idx + 1}]\n`;
      });

      // Discord only accepts http:// or https:// URLs for embed thumbnails. Data URIs and relative paths are rejected (HTTP 400 {"embeds": ["0"]}).
      const isValidImageUrl = auction.imageUrl && auction.imageUrl.startsWith("http");

      embeds.push({
        title: `📦 ${auction.itemName} ${auction.category ? `(${auction.category.toUpperCase()})` : ''}`,
        description: desc,
        color: 0x3B66D1,
        thumbnail: isValidImageUrl ? { url: auction.imageUrl } : undefined,
      });
    }

    if (embeds.length === 0) {
      return err("ไม่มีคิวที่กำลังรอในไอเทมที่เลือกเลยครับ", 400);
    }

    // Discord allows up to 10 embeds per message
    // If we have more than 10, we'll slice or send multiple. Let's just send up to 10 for now.
    const chunks = [];
    for (let i = 0; i < embeds.length; i += 10) {
      chunks.push(embeds.slice(i, i + 10));
    }

    for (const chunk of chunks) {
      const discordPayload = {
        content: "📢 **ประกาศคิวประมูลไอเทมกิลด์**",
        embeds: chunk
      };

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discordPayload)
      });

      if (!res.ok) {
        let errorMsg = `Discord API Error ${res.status}`;
        try {
          const discordErr = await res.json();
          if (discordErr && discordErr.message) {
            errorMsg += `: ${discordErr.message}`;
          } else {
            errorMsg += `: ${JSON.stringify(discordErr)}`;
          }
        } catch(e) {}
        return err(errorMsg, 400);
      }
    }

    const createdBy = auth.user.gameUsername || auth.user.discordUsername || "Admin";
    logAction({
      module: "SYSTEM",
      action: "ANNOUNCE_DISCORD",
      actor: createdBy,
      target: "Discord Webhook",
      detail: `ประกาศคิวประมูลเข้า Discord จำนวน ${embeds.length} ไอเทม`,
    });

    return ok({ success: true, count: embeds.length });
  } catch (error) {
    return handleServerError(error, "Failed to send to Discord");
  }
}
