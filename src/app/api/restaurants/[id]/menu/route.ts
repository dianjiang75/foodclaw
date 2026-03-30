import { prisma } from "@/lib/db/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const dishes = await prisma.dish.findMany({
      where: { restaurantId: id, isAvailable: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    const grouped: Record<string, typeof dishes> = {};
    for (const dish of dishes) {
      const cat = dish.category || "Other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(dish);
    }

    return Response.json({
      restaurant_id: id,
      categories: Object.entries(grouped).map(([category, items]) => ({
        name: category,
        dishes: items.map((d) => ({
          id: d.id,
          name: d.name,
          description: d.description,
          price: d.price ? Number(d.price) : null,
          dietary_flags: d.dietaryFlags,
          calories: d.caloriesMin !== null ? { min: d.caloriesMin, max: d.caloriesMax } : null,
          protein_g: d.proteinMaxG ? Number(d.proteinMaxG) : null,
        })),
      })),
    });
  } catch {
    return Response.json({ error: "Failed to fetch menu" }, { status: 500 });
  }
}
