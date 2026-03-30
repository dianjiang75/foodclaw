import { prisma } from "@/lib/db/client";
import { estimateWaitMinutes } from "@/lib/agents/logistics-poller";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const now = new Date();

    const logistics = await prisma.restaurantLogistics.findUnique({
      where: {
        restaurantId_dayOfWeek_hour: {
          restaurantId: id,
          dayOfWeek: now.getDay(),
          hour: now.getHours(),
        },
      },
    });

    if (!logistics) {
      return Response.json({
        busyness_pct: null,
        estimated_wait_minutes: null,
        data_available: false,
      });
    }

    return Response.json({
      busyness_pct: logistics.typicalBusynessPct,
      estimated_wait_minutes: logistics.typicalBusynessPct
        ? estimateWaitMinutes(logistics.typicalBusynessPct)
        : null,
      data_available: true,
      last_updated: logistics.updatedAt,
    });
  } catch {
    return Response.json({ error: "Failed to fetch traffic" }, { status: 500 });
  }
}
