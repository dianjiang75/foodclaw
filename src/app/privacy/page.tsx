import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto p-6 pb-20 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Privacy Policy</h1>
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">Home</Link>
      </div>

      <p className="text-sm text-muted-foreground">Last updated: April 1, 2026</p>

      <section className="space-y-3 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold">What We Collect</h2>
        <p>FoodClaw collects the minimum data needed to personalize your food discovery experience:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Account info</strong> — name, email, and hashed password (we never store raw passwords)</li>
          <li><strong>Dietary preferences</strong> — restrictions, allergens, and nutritional goals you set</li>
          <li><strong>Search activity</strong> — queries and filters to improve recommendations (not shared with third parties)</li>
          <li><strong>Location</strong> — approximate location for distance-based results (only when you grant permission)</li>
          <li><strong>Favorites</strong> — dishes you save</li>
        </ul>

        <h2 className="text-lg font-semibold mt-6">How We Use It</h2>
        <p>Your data is used exclusively to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Show you dishes that match your dietary needs and goals</li>
          <li>Filter out dishes containing your allergens</li>
          <li>Sort results by distance from your location</li>
          <li>Save your favorites across devices</li>
        </ul>

        <h2 className="text-lg font-semibold mt-6">Third-Party Services</h2>
        <p>We use the following services to power the app:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Google Places API</strong> — restaurant data, reviews, and photos</li>
          <li><strong>Yelp Fusion API</strong> — additional reviews and ratings</li>
          <li><strong>USDA FoodData Central</strong> — nutrition reference data</li>
          <li><strong>Railway</strong> — hosting and database</li>
        </ul>
        <p>We do not sell your data to any third party.</p>

        <h2 className="text-lg font-semibold mt-6">Cookies</h2>
        <p>We use a single HTTP-only authentication cookie to keep you logged in. No tracking cookies or analytics cookies are used.</p>

        <h2 className="text-lg font-semibold mt-6">Data Deletion</h2>
        <p>You can delete your account and all associated data by contacting us. We will remove your data within 30 days.</p>

        <h2 className="text-lg font-semibold mt-6">Contact</h2>
        <p>Questions about this policy? Email us at privacy@foodclaw.app.</p>
      </section>
    </div>
  );
}
