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
    const file = formData.get("image") as Blob;
    const type = formData.get("type") as string; // gvg-main, gvg-sub, castle

    if (!file) {
      return err("ไม่พบรูปภาพที่ต้องการส่ง", 400);
    }

    // Build the payload for Discord
    let content = "";
    if (type === "gvg-main") content = "⚔️ **Lineup: Guild War (สนามหลัก)**";
    else if (type === "gvg-sub") content = "⚔️ **Lineup: Guild War (สนามรอง)**";
    else if (type === "castle") content = "🏰 **Lineup: Siege War (ทีมชิงปราสาท)**";
    else content = "⚔️ **Lineup**";

    const discordFormData = new FormData();
    discordFormData.append("content", content);
    discordFormData.append("file", file, "lineup.png");

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
