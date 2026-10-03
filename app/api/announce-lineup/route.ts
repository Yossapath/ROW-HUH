import { requireAdmin } from "@/lib/auth";
import { err, ok, handleServerError, logAction } from "@/lib/server-utils";

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.errorResponse) return auth.errorResponse;

    const webhookUrl = process.env.DISCORD_LINEUP_WEBHOOK_URL || process.env.DISCORD_AUCTION_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
      return err("ยังไม่ได้ตั้งค่า Webhook URL สำหรับ Lineup ในระบบ (DISCORD_LINEUP_WEBHOOK_URL)", 400);
    }

    const formData = await request.formData();
    const type = formData.get("type") as string; // gvg-main, gvg-sub, castle

    const images = formData.getAll("image") as Blob[];
    if (!images || images.length === 0) {
      return err("ไม่พบรูปภาพที่ต้องการส่ง", 400);
    }

    // Build the payload for Discord
    let content = "";
    if (type === "gvg-main") content = "⚔️ **Guild War Line Up - Main Lane**";
    else if (type === "gvg-sub") content = "⚔️ **Guild War Line Up - Sub Lane**";
    else if (type === "castle") content = "🏰 **Siege War Line Up**";
    else content = "⚔️ **Line Up**";

    for (let i = 0; i < images.length; i++) {
      const discordFormData = new FormData();
      
      // ใส่ข้อความ Title เฉพาะรูปแรก เพื่อให้เนียนตาเวลาเรียงต่อกัน
      if (i === 0) {
        discordFormData.append("content", content);
      }
      
      discordFormData.append("file", images[i], `lineup-${i}.png`);

      const response = await fetch(webhookUrl, {
        method: "POST",
        body: discordFormData,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Discord API error: ${response.status} - ${text}`);
      }

      // หน่วงเวลาเล็กน้อยกัน Discord Rate Limit
      if (i < images.length - 1) {
        await new Promise(r => setTimeout(r, 800));
      }
    }

    logAction({
      module: "SYSTEM",
      action: "ANNOUNCE_LINEUP",
      actor: auth.user.gameUsername || auth.user.discordUsername || "Admin",
      target: "Discord",
      detail: `ประกาศ Lineup (${type}) ลง Discord`,
    });

    return ok({ success: true });
  } catch (error) {
    return handleServerError(error, "Failed to announce lineup to Discord");
  }
}
