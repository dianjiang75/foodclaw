---
name: user-test
description: Mock customer testing agent — runs 5 persona-based agents against live API endpoints to validate UX, safety, performance, and data quality from a real user's perspective. Runs after /improve at 6AM.
disable-model-invocation: false
allowed-tools: Read, Write, Glob, Grep, Bash
argument-hint: [persona-name]
effort: high
---

# FoodClaw User Test Agent

You simulate 5 real customers using the app end-to-end. You make actual API calls, analyze responses, inspect UI source code, and write a structured feedback report with issues and scores.

## Prerequisites

Before running personas, verify the app is reachable:

```bash
# Check if app is running
curl -sf http://localhost:3000/api/health > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "App not running, starting dev server..."
  cd /Users/dian/Desktop/agentic\ food\ app/nutriscout
  npm run dev &
  sleep 10
fi
```

Also check the database has data:
```bash
curl -s http://localhost:3000/api/search?lat=40.7264\&lng=-73.9878\&limit=1 | grep -c '"id"'
```
If 0 results, write a report noting "Empty database — no dishes to test" and exit.

If `$ARGUMENTS` is provided (e.g., "alice"), run only that persona. Otherwise run all 5.

## Default Location

Use Manhattan NYC for all tests: `lat=40.7264&lng=-73.9878`

---

## Persona 1: Explorer Emma — New User Browsing

**Who**: First-time user, casually browsing, trying different categories, wants to discover new food.

**Test sequence** (run these curl commands and analyze responses):

1. **Default browse**: `curl -s "http://localhost:3000/api/search?lat=40.7264&lng=-73.9878&limit=20"`
   - Assert: 200 status, dishes[] non-empty, each has id/name/restaurant_name/macros
   - Check: >50% of dishes have photo_url (not null)
   - Check: no duplicate dish IDs

2. **Category browse** (3 categories): `curl -s "http://localhost:3000/api/search?lat=40.7264&lng=-73.9878&categories=thai"` then `japanese`, then `italian`
   - Assert: results match the category
   - Check: different dishes returned for different categories

3. **Search for nonsense**: `curl -s "http://localhost:3000/api/search?lat=40.7264&lng=-73.9878&q=xyznonexistent123"`
   - Assert: returns 200 with empty dishes[], not a 500 error

4. **Search for real dish**: `curl -s "http://localhost:3000/api/search?lat=40.7264&lng=-73.9878&q=chicken"`
   - Assert: results contain "chicken" in name or description

5. **Pagination**: `curl` with `limit=5&offset=0` then `limit=5&offset=5`
   - Assert: no overlapping dish IDs between pages

6. **Dish detail**: `curl -s "http://localhost:3000/api/dishes/{first_dish_id}"`
   - Assert: full detail returned with restaurant, macros, dietary_flags

**UI code inspection**: Read `src/components/dish-card.tsx`, `src/app/page.tsx` — check empty state handling, photo fallback

**Score criteria**: Data completeness, category accuracy, empty state UX, photo coverage

---

## Persona 2: Protein Pete — Fitness Enthusiast

**Who**: Gym bro, wants max protein, sorts by macros, filters by nutritional goals.

**Test sequence**:

1. **Max protein sort**: `curl -s "http://localhost:3000/api/search?lat=40.7264&lng=-73.9878&goal=max_protein&sort=macro_match&limit=20"`
   - Assert: results sorted by protein descending
   - Check: all have non-null protein values

2. **Protein minimum filter**: `curl -s "http://localhost:3000/api/search?lat=40.7264&lng=-73.9878&protein_min=30&goal=max_protein"`
   - Assert: every dish has protein_max_g >= 30

3. **Keto + protein**: `curl -s "http://localhost:3000/api/search?lat=40.7264&lng=-73.9878&diet=keto&goal=max_protein"`
   - Check: dietary_flags include keto-appropriate values

4. **Dish detail macro check**: `curl -s "http://localhost:3000/api/dishes/{highest_protein_id}"`
   - Assert: macro_source present, protein values sensible (< 200g per dish)

5. **Similar dishes**: `curl -s "http://localhost:3000/api/dishes/{id}/similar?lat=40.7264&lng=-73.9878&limit=5"`
   - Assert: similar dishes have comparable protein, different restaurants

6. **Calorie cap**: `curl -s "http://localhost:3000/api/search?lat=40.7264&lng=-73.9878&calorie_limit=500&goal=max_protein"`
   - Assert: all results have calories_max <= 500

**UI code inspection**: Read `src/components/macro-bar.tsx` — verify protein highlight works, proportion math correct

**Score criteria**: Sort correctness, protein filter reliability, macro accuracy, macro source transparency

---

## Persona 3: Allergy Alice — Nut Allergy + Celiac (SAFETY CRITICAL)

**Who**: Has life-threatening nut allergy and celiac disease. A false positive could hospitalize her.

**Test sequence**:

1. **Allergy filter**: `curl -s "http://localhost:3000/api/search?lat=40.7264&lng=-73.9878&diet=nut_free,gluten_free&limit=20"`
   - **CRITICAL**: EVERY result MUST have dietary_flags.nut_free === true AND dietary_flags.gluten_free === true
   - **CRITICAL**: dietary_confidence >= 0.85 for both (ALLERGY_CRITICAL_MIN)
   - Check: warnings[] present on dishes with confidence < 0.9

2. **Allergen exclusion**: `curl -s "http://localhost:3000/api/search?lat=40.7264&lng=-73.9878&allergens=tree_nuts,peanuts,wheat,gluten"`
   - Cross-check consistency with step 1

3. **Dangerous dish test**: `curl -s "http://localhost:3000/api/search?lat=40.7264&lng=-73.9878&q=pad+thai&diet=nut_free"`
   - Pad thai commonly contains peanuts — should NOT return dishes flagged nut_free unless confidence is high

4. **Detail check**: `curl -s "http://localhost:3000/api/dishes/{gluten_free_dish_id}"`
   - Assert: dietary_flags.gluten_free === true, confidence shown, ingredients available

5. **Read evaluator source**: Read `src/lib/evaluator/index.ts`
   - Verify ALLERGY_CRITICAL includes "nut_free" and "gluten_free"
   - Verify ALLERGY_CRITICAL_MIN is 0.85
   - Verify null-flag dishes are excluded for critical restrictions

6. **Read filter drawer source**: Read `src/components/filter-drawer.tsx`
   - Verify FDA Big 9 allergens are prominently listed
   - Verify allergen section is clearly labeled

**Score criteria**: ZERO false positives (most heavily weighted), warning visibility, confidence enforcement, ingredient transparency

---

## Persona 4: Speedy Sam — In a Rush

**Who**: Has 15 minutes for lunch, wants fastest food nearby.

**Test sequence**:

1. **Wait time sort**: `curl -s "http://localhost:3000/api/search?lat=40.7264&lng=-73.9878&sort=wait_time&limit=20"`
   - Assert: sorted by estimated_wait_minutes ascending
   - Check: null wait times pushed to end, not beginning

2. **Max wait filter**: `curl -s "http://localhost:3000/api/search?lat=40.7264&lng=-73.9878&max_wait=15&sort=wait_time"`
   - Assert: all results have wait <= 15 min

3. **Distance sort**: `curl -s "http://localhost:3000/api/search?lat=40.7264&lng=-73.9878&sort=distance&radius=1&limit=20"`
   - Assert: sorted by distance ascending, all within 1 mile

4. **Delivery filter**: `curl -s "http://localhost:3000/api/search?lat=40.7264&lng=-73.9878&delivery=true&sort=wait_time"`
   - Check: delivery data present on results

5. **Traffic check**: `curl -s "http://localhost:3000/api/restaurants/{id}/traffic"`
   - Assert: returns busyness/wait data, values reasonable

6. **Restaurant list**: `curl -s "http://localhost:3000/api/restaurants?lat=40.7264&lng=-73.9878"`
   - Check: distanceMiles and estimatedWait present

**UI code inspection**: Read `src/components/wait-badge.tsx` — verify color coding thresholds

**Score criteria**: Sort correctness, null handling, delivery reliability, wait time data coverage

---

## Persona 5: Foodie Fiona — Quality-Focused

**Who**: Cares about food quality, reads every review, checks photos, wants transparent data.

**Test sequence**:

1. **Rating sort**: `curl -s "http://localhost:3000/api/search?lat=40.7264&lng=-73.9878&sort=rating&limit=20"`
   - Assert: sorted by rating descending

2. **Dish detail completeness**: `curl -s "http://localhost:3000/api/dishes/{top_rated_id}"`
   - Assert: description non-null and >20 chars
   - Assert: review_summary has average_rating, summary, review_count, praises, complaints
   - Assert: photos non-empty
   - Assert: macro_source_detail has tier_label

3. **Photo check**: Check dish photos — URLs resolve (start with https://), multiple sources preferred

4. **Similar dishes**: `curl -s "http://localhost:3000/api/dishes/{id}/similar?lat=40.7264&lng=-73.9878&limit=5"`
   - Assert: returns different restaurants, same cuisine/category

5. **Multiple dish details** (top 5): Check macro_source variety, cross_validated field, confidence values

6. **Restaurant menu**: `curl -s "http://localhost:3000/api/restaurants/{id}/menu"`
   - Assert: menu items with name, description, price, dietary flags

**UI code inspection**: Read `src/app/dish/[id]/page.tsx` — check photo gallery, review display, macro source badge

**Score criteria**: Content completeness, photo availability, review quality, macro transparency

---

## Report Output

Write ALL findings to `agent-workspace/user-test-reports/YYYY-MM-DD-user-test.md`:

```markdown
# User Test Report — {date}

## Summary
| Persona | Score | Critical | Major | Minor |
|---------|-------|----------|-------|-------|
| Explorer Emma | X/10 | N | N | N |
| Protein Pete | X/10 | N | N | N |
| Allergy Alice | X/10 | N | N | N |
| Speedy Sam | X/10 | N | N | N |
| Foodie Fiona | X/10 | N | N | N |

## Explorer Emma
### Actions Taken
| Step | Endpoint | Status | Response Time | Result |
### Issues Found
| Severity | Description | Expected | Actual |
### Suggestions
1. ...
### Score: X/10

## Protein Pete
... (same structure)

## Allergy Alice
... (same structure, CRITICAL issues highlighted)

## Speedy Sam
...

## Foodie Fiona
...

## Actionable Backlog
| Severity | Persona | Issue | Target File | Suggested Fix |
```

Also **append new issues** to `agent-workspace/user-test-reports/BACKLOG.md`.

---

## Safety Rules

1. Only make GET requests — never POST/PUT/DELETE (except auth for testing)
2. Don't modify any source code — this is a read-only testing agent
3. Don't crash the dev server — use reasonable request rates
4. ALWAYS report Allergy Alice issues as CRITICAL if dietary flags are wrong
5. Write the report even if some tests fail — partial data is better than none
