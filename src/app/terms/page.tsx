import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto p-6 pb-20 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Terms of Service</h1>
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">Home</Link>
      </div>

      <p className="text-sm text-muted-foreground">Last updated: April 1, 2026</p>

      <section className="space-y-3 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold">Acceptance</h2>
        <p>By using FoodClaw, you agree to these terms. If you disagree, please do not use the service.</p>

        <h2 className="text-lg font-semibold mt-6">What FoodClaw Does</h2>
        <p>FoodClaw helps you discover restaurant dishes based on dietary restrictions, nutritional goals, and location. We aggregate publicly available information from restaurants, review platforms, and nutrition databases.</p>

        <h2 className="text-lg font-semibold mt-6">Nutritional Data Disclaimer</h2>
        <p><strong>Nutritional information is estimated and not guaranteed.</strong> Data comes from multiple sources including restaurant-published nutrition, third-party databases, and AI-based photo analysis. Always verify with the restaurant if you have severe allergies or medical dietary needs.</p>

        <h2 className="text-lg font-semibold mt-6">Allergen Safety</h2>
        <p>While we make every effort to flag common allergens, <strong>FoodClaw cannot guarantee allergen-free dishes</strong>. Cross-contamination risks, ingredient changes, and data accuracy limitations mean you should always confirm allergen information directly with the restaurant.</p>

        <h2 className="text-lg font-semibold mt-6">User Accounts</h2>
        <p>You are responsible for maintaining the security of your account. Do not share your credentials.</p>

        <h2 className="text-lg font-semibold mt-6">Acceptable Use</h2>
        <p>Do not use FoodClaw to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Scrape or bulk-download data</li>
          <li>Abuse rate limits or API endpoints</li>
          <li>Impersonate other users</li>
          <li>Submit false community feedback</li>
        </ul>

        <h2 className="text-lg font-semibold mt-6">Limitation of Liability</h2>
        <p>FoodClaw is provided &ldquo;as is&rdquo; without warranty. We are not liable for adverse health outcomes from relying on nutritional estimates. Always consult a healthcare provider for medical dietary advice.</p>

        <h2 className="text-lg font-semibold mt-6">Changes</h2>
        <p>We may update these terms. Continued use after changes constitutes acceptance.</p>

        <h2 className="text-lg font-semibold mt-6">Contact</h2>
        <p>Questions? Email legal@foodclaw.app.</p>
      </section>
    </div>
  );
}
