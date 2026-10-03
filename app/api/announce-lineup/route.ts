import { requireAdmin } from "@/lib/auth";
import { err, ok, handleServerError, logAction } from "@/lib/server-utils";

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.errorResponse) return auth.errorResponse;

    const webhookUrl = process.env.DISCORD_LINEUP_WEBHOOK_URL;
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
    const now = new Date();
    const dateStr = now.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    let title = "";
    if (type === "gvg-main") title = `Guild War Line Up - Main Lane - ${dateStr}`;
    else if (type === "gvg-sub") title = `Guild War Line Up - Sub Lane - ${dateStr}`;
    else if (type === "castle") title = `Siege War Line Up - ${dateStr}`;
    else title = `Line Up - ${dateStr}`;

    const embeds = images.map((_, i) => {
      const embed: any = {
        color: 0x2b2d31, // Discord dark embed background color
        image: { url: `attachment://lineup-${i}.png` }
      };
      if (i === 0) embed.title = title;
      return embed;
    });

    const discordFormData = new FormData();
    discordFormData.append("payload_json", JSON.stringify({ embeds }));

    images.forEach((blob, i) => {
      discordFormData.append(`files[${i}]`, blob, `lineup-${i}.png`);
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
