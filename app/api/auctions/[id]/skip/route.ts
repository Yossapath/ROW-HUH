import { requireAdmin } from "@/lib/auth";
import { err, ok, handleServerError, logAction } from "@/lib/server-utils";
import { skipReservation } from "@/lib/auction/reservations";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdmin();
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(request.url);
    const reservationId = searchParams.get("reservationId");
    if (!reservationId) return err("Missing reservationId", 400);

    const adminName = auth.user.gameUsername || auth.user.discordUsername || "Admin";
    const result = await skipReservation(reservationId, auth.user.discordId, adminName);
    
    if (!result.success) {
      return err(result.error || "Failed to skip queue", 400);
    }

    logAction({
      module: "SYSTEM",
      action: "SKIP_QUEUE",
      actor: adminName,
      target: result.itemName || params.id,
      detail: `ข้ามคิวของ ${result.characterName} (ย้ายไปต่อท้าย) ของไอเทม ${result.itemName}`,
    });

    return ok({ success: true });
  } catch (error) {
    return handleServerError(error, "Failed to skip queue");
  }
}
