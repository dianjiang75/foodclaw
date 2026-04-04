import "dotenv/config";

async function main() {
  const { PrismaClient } = await import("../src/generated/prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  // Check for wines/spirits/cocktails by name pattern
  const wines = await prisma.dish.findMany({
    where: { OR: [
      { name: { contains: "Barolo", mode: "insensitive" } },
      { name: { contains: "Pinot", mode: "insensitive" } },
      { name: { contains: "Cabernet", mode: "insensitive" } },
      { name: { contains: "Chardonnay", mode: "insensitive" } },
      { name: { contains: "Sauvignon", mode: "insensitive" } },
      { name: { contains: "Merlot", mode: "insensitive" } },
      { name: { contains: "Beaujolais", mode: "insensitive" } },
      { name: { contains: "Riesling", mode: "insensitive" } },
      { name: { contains: "Prosecco", mode: "insensitive" } },
    ]},
    select: { name: true, category: true },
  });
  console.log(`\nWine items: ${wines.length}`);
  wines.slice(0, 10).forEach(w => console.log(`  "${w.name}" [${w.category}]`));

  // Spirits
  const spirits = await prisma.dish.findMany({
    where: { OR: [
      { name: { contains: "Añejo", mode: "insensitive" } },
      { name: { contains: "Bourbon", mode: "insensitive" } },
      { name: { contains: "Whiskey", mode: "insensitive" } },
      { name: { contains: "Vodka", mode: "insensitive" } },
      { name: { contains: "Tequila", mode: "insensitive" } },
      { name: { contains: "Grand Marnier", mode: "insensitive" } },
      { name: { contains: "Mezcal", mode: "insensitive" } },
    ]},
    select: { name: true, category: true },
  });
  console.log(`\nSpirits items: ${spirits.length}`);
  spirits.slice(0, 10).forEach(s => console.log(`  "${s.name}" [${s.category}]`));

  // Check for "sides" category items still in DB
  const sides = await prisma.dish.findMany({
    where: { category: { in: ["Sides", "sides", "SIDES", "Side Dishes", "Add-Ons", "Extras"] } },
    select: { name: true, category: true },
    take: 15,
  });
  console.log(`\nSides/add-ons still in DB: ${sides.length}`);
  sides.forEach(s => console.log(`  "${s.name}" [${s.category}]`));

  // Total dish count
  const total = await prisma.dish.count();
  console.log(`\nTotal dishes: ${total}`);

  await prisma.$disconnect();
}
main();
