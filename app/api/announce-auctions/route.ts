import { requireAdmin } from "@/lib/auth";
import { err, ok, handleServerError, logAction } from "@/lib/server-utils";
import { getAuctions } from "@/lib/auction/auctions";
import { getAuctionQueue } from "@/lib/auction/reservations";
import { formatCategoryLabel } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.errorResponse) return auth.errorResponse;

    const webhookUrl = process.env.DISCORD_AUCTION_WEBHOOK_URL;
    if (!webhookUrl) {
      return err("ยังไม่ได้ตั้งค่า Webhook URL ในระบบ (DISCORD_AUCTION_WEBHOOK_URL)", 400);
    }

    const body = await request.json();
    const { auctionIds, mode = 'all' } = body;

    if (!auctionIds || !Array.isArray(auctionIds) || auctionIds.length === 0) {
      return err("กรุณาเลือกไอเทมอย่างน้อย 1 รายการ", 400);
    }

    const allAuctions = await getAuctions();
    
    const chunks: string[] = [];
    let currentChunk = "📢 **ประกาศคิวประมูลไอเทมกิลด์**\n\n";
    let hasAnyWaiting = false;
    
    for (const id of auctionIds) {
      const auction = allAuctions.find(a => a.id === id);
      if (!auction) continue;

      const queue = await getAuctionQueue(id);
      let waiting = queue.filter(q => q.status === "waiting");
      if (mode === 'first' && waiting.length > 0) {
        waiting = [waiting[0]];
      }
      
      if (waiting.length === 0) continue;
      hasAnyWaiting = true;

      let itemText = `**${auction.itemName}** ${auction.category ? `(${formatCategoryLabel(auction.category)})` : ''}\n`;
      waiting.forEach((q, idx) => {
        itemText += `<@${q.userId}> | ${q.characterName} | คิวที่ ${idx + 1}\n`;
      });
      itemText += "\n";

      if (currentChunk.length + itemText.length > 1900) {
        chunks.push(currentChunk);
        currentChunk = itemText;
      } else {
        currentChunk += itemText;
      }
    }

    if (!hasAnyWaiting) {
      return err("ไม่มีคิวที่กำลังรอในไอเทมที่เลือกเลยครับ", 400);
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk);
    }

    for (const chunk of chunks) {
      const discordPayload = {
        content: chunk.trim()
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
      detail: `ประกาศคิวประมูลเข้า Discord จำนวน ${auctionIds.length} ไอเทม`,
    });

    return ok({ success: true, count: auctionIds.length });
  } catch (error) {
    return handleServerError(error, "Failed to send to Discord");
  }
}
