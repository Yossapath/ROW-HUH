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

    const discordFormData = new FormData();
    discordFormData.append("content", content);
    
    images.forEach((blob, idx) => {
      discordFormData.append(`file${idx}`, blob, `lineup-${idx}.png`);
    });

    const response = await fetch(webhookUrl, {
      method: "POST",
      body: discordFormData,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Discord API error: ${response.status} - ${text}`);
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
