/**
 * CLI script to check foot traffic for a restaurant.
 * Usage: npx tsx -r tsconfig-paths/register scripts/check-traffic.ts "Restaurant Name" "123 Main St"
 */
import "dotenv/config";

async function main() {
  const [name, address] = process.argv.slice(2);

  if (!name || !address) {
    console.error(
      'Usage: npx tsx -r tsconfig-paths/register scripts/check-traffic.ts "Restaurant Name" "Address"'
    );
    process.exit(1);
  }

  const { getFootTraffic, checkDeliveryAvailability } = await import(
    "../src/lib/agents/logistics-poller"
  );

  console.log(`\nChecking traffic for: "${name}" at "${address}"\n`);

  try {
    const traffic = await getFootTraffic(name, address);
    console.log(`Current Busyness: ${traffic.current_busyness_pct}%`);
    console.log(`Busier Than Usual: ${traffic.is_busier_than_usual}`);
    console.log(`Estimated Wait: ${traffic.estimated_wait_minutes ?? "N/A"} min`);
    console.log(`Peak Hours: ${traffic.peak_hours_today.map((h) => `${h.start}-${h.end}`).join(", ") || "N/A"}`);
    console.log(`Quiet Hours: ${traffic.quiet_hours_today.map((h) => `${h.start}-${h.end}`).join(", ") || "N/A"}`);
  } catch (err) {
    console.error("Traffic Error:", (err as Error).message);
  }

  console.log("\n--- Delivery Options ---");
  const delivery = await checkDeliveryAvailability(name, address);
  for (const d of delivery) {
    console.log(
      `${d.platform}: $${d.delivery_fee_min}-$${d.delivery_fee_max}, ${d.estimated_minutes_min}-${d.estimated_minutes_max} min`
    );
  }

  process.exit(0);
}

main();
