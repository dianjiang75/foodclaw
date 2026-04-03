# FoodClaw Security, Privacy & Compliance Report
**Date**: 2026-03-30
**Focus**: Security, Privacy, and Compliance
**Research Depth**: 10 web searches, 23 tool uses, comprehensive analysis

## Comprehensive Analysis for a Dish-First Food Discovery App

---

## Table of Contents

1. [Health Data Privacy: HIPAA, GDPR & Dietary Data Classification](#1-health-data-privacy)
2. [Authentication Architecture](#2-authentication)
3. [Data Breach Prevention](#3-breach-prevention)
4. [COPPA Compliance for Children](#4-coppa)
5. [App Store Privacy Labels](#5-app-store)
6. [Database Security: PostgreSQL Encryption & RLS](#6-database-security)
7. [Rate Limiting & API Abuse Prevention](#7-rate-limiting)
8. [OWASP Top 10 2025 Threats](#8-owasp)
9. [SOC 2 Compliance](#9-soc2)
10. [Location Data Privacy](#10-location-data)

---

## 1. Health Data Privacy: HIPAA, GDPR & Dietary Data Classification

### Is Dietary Restriction Data "Health Data"?

**YES -- conditionally, and this is the single most important finding in this report.**

Under **GDPR Article 9**, dietary data that reveals a medical condition is classified as **sensitive personal data (special category data)**. Specifically:

- **Plain food preferences** (e.g., "I like Italian food") = **NOT** health data
- **Diet choices** (e.g., "I'm vegetarian") = **NOT** health data on its own
- **Medical dietary restrictions** (e.g., celiac disease, IBS, PCOS, food allergies) = **YES, this IS health data**

Since FoodClaw explicitly stores celiac, IBS, PCOS, and food allergy data, **the app processes sensitive health data under GDPR Article 9**.

Under GDPR, allergy information is specifically classified as health data, and the only relevant legal basis for processing it is **explicit consent** from the data subject (Article 9(2)(a)).

### HIPAA Applicability

HIPAA generally does **NOT** apply to consumer health apps unless the app:
- Acts as a Business Associate to a covered entity (hospital, insurer)
- Receives data from a HIPAA-covered entity

However, the **FTC Health Breach Notification Rule (HBNR)**, updated July 2024, **DOES** apply to health apps. It requires:
- Notification to users within 60 days of a breach
- Notification to the FTC
- Media notification if 500+ users affected

### Compliance Requirements

| Regulation | Applies? | Key Requirements |
|---|---|---|
| GDPR Article 9 | YES (if serving EU users) | Explicit consent, DPO appointment, DPIA required |
| FTC HBNR | YES | Breach notification within 60 days |
| HIPAA | NO (unless partnered with covered entities) | N/A for now |
| State health privacy laws (WA My Health My Data Act) | YES | Consent for health data collection, deletion rights |

### Implementation Checklist

- [ ] Implement **explicit, granular consent** for each category of health data (celiac, IBS, PCOS separately)
- [ ] Consent must be **freely given, specific, informed, and unambiguous** (not buried in T&C)
- [ ] Build a **consent management system** with timestamps and version tracking
- [ ] Implement **Data Subject Access Request (DSAR)** workflow (access, rectification, erasure, portability)
- [ ] Conduct a **Data Protection Impact Assessment (DPIA)** before launch
- [ ] Appoint a **Data Protection Officer (DPO)** if processing health data at scale in the EU
- [ ] Implement **FTC HBNR breach notification** pipeline

### Code Pattern: Consent Management

```typescript
// prisma/schema.prisma
model UserConsent {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  category    ConsentCategory
  granted     Boolean
  version     String   // e.g., "privacy-policy-v2.1"
  ipAddress   String?
  userAgent   String?
  grantedAt   DateTime @default(now())
  revokedAt   DateTime?

  @@index([userId, category])
}

enum ConsentCategory {
  DIETARY_PREFERENCES    // Not sensitive
  MEDICAL_CONDITIONS     // GDPR Article 9
  LOCATION_DATA          // Sensitive
  ANALYTICS              // Standard
  MARKETING              // Standard
}

// lib/consent.ts
export async function requireHealthDataConsent(
  userId: string
): Promise<boolean> {
  const consent = await prisma.userConsent.findFirst({
    where: {
      userId,
      category: 'MEDICAL_CONDITIONS',
      granted: true,
      revokedAt: null,
    },
  });

  if (!consent) {
    throw new ConsentRequiredError(
      'Explicit consent required to process medical dietary data'
    );
  }
  return true;
}
```

### What Happens If You Get It Wrong

- **GDPR**: Fines up to **EUR 20 million or 4% of global annual turnover** (whichever is higher)
- **FTC HBNR**: Civil penalties + mandatory 20-year consent orders
- **Example**: The FTC fined GoodRx $1.5M in 2023 for sharing health data with advertisers without consent

### Cost Estimates

| Item | Cost |
|---|---|
| Privacy lawyer for GDPR compliance review | $5,000--$15,000 |
| Consent management platform (OneTrust, Cookiebot) | $200--$500/month |
| DPIA preparation | $3,000--$10,000 |
| DPO (fractional/outsourced) | $2,000--$5,000/month |

### Priority: **MUST-HAVE BEFORE LAUNCH**

**Sources:**
- [GDPR and Nutrition Apps: Is Food Data Sensitive?](https://legalitgroup.com/en/gdpr-and-personalized-nutrition-apps/)
- [GDPR Article 9 - Processing of Special Categories](https://gdpr-info.eu/art-9-gdpr/)
- [Dietary, Religious and Disability Data Need Protection Too](https://thrivemeetings.com/2019/12/dietary-and-disability-data-need-protection-too_gdpr/)

---

## 2. Authentication Architecture

### Current Best Approach: Auth.js v5 (formerly NextAuth)

Auth.js v5 is the standard for Next.js authentication in 2025--2026, with ~2.5M weekly npm downloads. It is a complete rewrite prioritizing App Router compatibility.

**CRITICAL VULNERABILITY**: In March 2025, **CVE-2025-29927 (CVSS 9.1)** revealed that attackers could bypass Next.js middleware entirely by sending an `x-middleware-subrequest` header. This means **auth checks must NOT rely solely on middleware**.

### Recommended Architecture

```typescript
// auth.ts - Auth.js v5 configuration
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" }, // NOT jwt for health apps - enables revocation
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user?.hashedPassword) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.hashedPassword
        );
        return valid ? user : null;
      },
    }),
  ],
  callbacks: {
    session: ({ session, user }) => ({
      ...session,
      user: { ...session.user, id: user.id, role: user.role },
    }),
  },
});

// CRITICAL: Auth check in Data Access Layer, NOT just middleware
// lib/dal.ts (Data Access Layer)
import { auth } from "@/auth";
import { cache } from "react";

export const getAuthenticatedUser = cache(async () => {
  const session = await auth();
  if (!session?.user) {
    throw new AuthenticationError("Not authenticated");
  }
  return session.user;
});
```

### Session Strategy Decision

For a health app, use **database sessions** (not JWT):
- **Database sessions** enable immediate revocation ("sign out everywhere") -- essential if an account is compromised
- **JWTs** cannot be revoked until expiration, which is unacceptable for health data
- Trade-off: database sessions add latency from DB lookups, but Redis caching mitigates this

### Security Cookie Configuration

```typescript
// next.config.ts
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.nutriscout.com;"
  },
];
```

### Implementation Checklist

- [ ] Use **Auth.js v5** with database session strategy
- [ ] Implement auth checks in **Route Handlers and Server Actions**, not just middleware
- [ ] Hash passwords with **bcrypt** (cost factor 12+)
- [ ] Enable **2FA/MFA** for accounts with medical data
- [ ] Set session cookies with **HttpOnly, Secure, SameSite=Lax, __Host- prefix**
- [ ] Implement **account lockout** after 5 failed login attempts
- [ ] Add **session invalidation** ("sign out everywhere") capability
- [ ] Configure all security headers (HSTS, CSP, X-Frame-Options)
- [ ] Keep Next.js updated (CVE-2025-29927 patched in 14.2.25, 15.2.3)

### Cost Estimates

| Item | Cost |
|---|---|
| Auth.js (self-hosted) | Free (open source) |
| Alternative: Clerk (managed) | $25--$99/month |
| 2FA provider (e.g., Twilio Verify) | ~$0.05/verification |
| Development time (production-ready) | 40--80 hours |

### Priority: **MUST-HAVE BEFORE LAUNCH**

**Sources:**
- [Auth.js v5 with Next.js 16: Complete Authentication Guide (2026)](https://dev.to/huangyongshan46a11y/authjs-v5-with-nextjs-16-the-complete-authentication-guide-2026-2lg)
- [Best Next.js Authentication Solutions in 2026](https://www.pkgpulse.com/blog/best-nextjs-auth-solutions-2026)
- [Next.js Security Best Practices: Complete 2026 Guide](https://www.authgear.com/post/nextjs-security-best-practices)

---

## 3. Data Breach Prevention (Lessons from MyFitnessPal)

### The MyFitnessPal Breach: What Went Wrong

In 2018, MyFitnessPal exposed **150 million user records** including usernames, emails, and passwords. The critical failure: passwords were hashed with **SHA-1**, a known-weak algorithm. Key lessons:

1. **Weak hashing** -- SHA-1 is trivially crackable; they should have used bcrypt/argon2
2. **Flat data model** -- all user data in one accessible system
3. **Delayed detection** -- breach went undetected for weeks
4. **No field-level encryption** -- medical/dietary data stored in plaintext

### Prevention Architecture for FoodClaw

```typescript
// lib/security/password.ts
import { hash, verify } from "argon2";

// Use Argon2id (winner of Password Hashing Competition)
export async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    type: 2, // argon2id
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4,
  });
}

export async function verifyPassword(
  hash: string,
  password: string
): Promise<boolean> {
  return verify(hash, password);
}

// lib/security/audit-log.ts
export async function logSecurityEvent(event: {
  userId?: string;
  action: 'LOGIN' | 'LOGOUT' | 'FAILED_LOGIN' | 'DATA_ACCESS' |
          'DATA_EXPORT' | 'CONSENT_CHANGE' | 'SETTINGS_CHANGE';
  ip: string;
  userAgent: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      ...event,
      timestamp: new Date(),
      metadata: event.metadata ? JSON.stringify(event.metadata) : null,
    },
  });

  // Alert on suspicious patterns
  if (event.action === 'FAILED_LOGIN') {
    const recentFailures = await prisma.auditLog.count({
      where: {
        ip: event.ip,
        action: 'FAILED_LOGIN',
        timestamp: { gte: new Date(Date.now() - 15 * 60 * 1000) },
      },
    });
    if (recentFailures >= 5) {
      await alertSecurityTeam('BRUTE_FORCE_DETECTED', { ip: event.ip });
    }
  }
}
```

### Implementation Checklist

- [ ] Use **Argon2id** for password hashing (NOT bcrypt, NOT SHA-*)
- [ ] Implement **field-level encryption** for medical/dietary data (see Section 6)
- [ ] Deploy **intrusion detection** and anomaly monitoring
- [ ] Build comprehensive **audit logging** for all data access
- [ ] Implement **data segmentation** -- separate medical data from general app data
- [ ] Conduct **penetration testing** quarterly ($5K--$15K per test)
- [ ] Establish **incident response plan** with <72 hour notification capability
- [ ] Enable **automated vulnerability scanning** in CI/CD (Snyk, Dependabot)
- [ ] Implement **data minimization** -- don't collect what you don't need
- [ ] Set up **breach detection** alerting (unusual data access patterns)

### What Happens If You Get It Wrong

- MyFitnessPal: Under Armour's stock dropped, $29M settlement
- **GDPR**: Must notify within 72 hours or face additional fines
- **FTC HBNR**: Must notify within 60 days; violations are per-user penalties
- **Reputational damage**: 64% of consumers say they would stop using a service after a breach

### Priority: **MUST-HAVE BEFORE LAUNCH**

**Sources:**
- [MyFitnessPal Data Breach - Digging Deeper](https://sneb.org/myfitnesspal-data-breach-digging-deeper/)
- [Under Armour MyFitnessPal Data Breach | Huntress](https://www.huntress.com/threat-library/data-breach/under-armour-myfitness-pal-data-breach)

---

## 4. COPPA Compliance (Children & Food Allergies)

### Does FoodClaw Need COPPA Compliance?

**YES, if any of these are true:**

1. The app is **directed to children under 13** (even partially)
2. The app has **actual knowledge** that it collects data from children under 13
3. Parents use the app to **track their children's food allergies**

If parents are tracking kids' allergies, and the app stores a child's name, age, or dietary restrictions, COPPA applies.

### 2025--2026 COPPA Amendments (Effective April 22, 2026)

The FTC finalized major COPPA amendments on January 16, 2025:

- **Expanded definition of personal information**: Now includes persistent identifiers, precise geolocation, photos/videos, biometric data
- **Stricter parental consent**: Parents must be able to consent to collection/use WITHOUT consenting to third-party disclosure
- **Data retention limits**: Can only keep children's data as long as "reasonably needed" for the original purpose; indefinite retention is **prohibited**
- **Enhanced direct notice**: Must include names/categories of third parties receiving data and data retention policies

### Penalty Structure

**$53,088 per violation per day** (2025 rate). A "violation" = unlawful collection from a **single child**, meaning penalties scale with user count.

**Recent enforcement examples:**
- **Epic Games (Fortnite)**: $520 million (2022)
- **Disney**: $10 million settlement (December 2025)

### Implementation: Two Strategies

**Strategy A: Age Gate (Recommended for Launch)**

```typescript
// middleware.ts or registration flow
export async function verifyAge(dateOfBirth: Date): Promise<AgeVerification> {
  const age = calculateAge(dateOfBirth);

  if (age < 13) {
    return {
      allowed: false,
      reason: 'COPPA_UNDERAGE',
      action: 'BLOCK_REGISTRATION',
    };
  }

  if (age < 16) {
    // GDPR requires parental consent for under-16 in some EU countries
    return {
      allowed: true,
      requiresParentalConsent: true,
      action: 'REQUEST_PARENTAL_CONSENT',
    };
  }

  return { allowed: true, requiresParentalConsent: false };
}
```

**Strategy B: Full COPPA Compliance (If Supporting Child Profiles)**

```typescript
// lib/coppa/parental-consent.ts
export async function initiateParentalConsent(params: {
  childId: string;
  parentEmail: string;
}) {
  // 1. Send verification email to parent
  // 2. Parent must complete one of FTC-approved consent methods:
  //    - Sign and return a consent form (email/fax/mail)
  //    - Credit card transaction (as proof of identity)
  //    - Video conference with trained personnel
  //    - Government ID verification
  // 3. Store consent record with timestamp

  const consentRecord = await prisma.parentalConsent.create({
    data: {
      childUserId: params.childId,
      parentEmail: params.parentEmail,
      method: 'EMAIL_PLUS_DELAYED', // FTC "email plus" method
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48h expiry
    },
  });

  // Child data CANNOT be used until consent is verified
  await prisma.user.update({
    where: { id: params.childId },
    data: { accountStatus: 'PENDING_PARENTAL_CONSENT' },
  });

  return consentRecord;
}
```

### Implementation Checklist

- [ ] Implement **age verification** at registration (date of birth, not just checkbox)
- [ ] **Decision**: Block under-13 users OR build full COPPA consent workflow
- [ ] If allowing children: implement **FTC-approved parental consent mechanism**
- [ ] Build **parental dashboard** for reviewing/deleting child data
- [ ] Implement **data retention limits** for children's data
- [ ] Do **NOT** share children's data with third parties without separate parental consent
- [ ] Post a **clear, child-friendly privacy policy**
- [ ] Provide parents the ability to **revoke consent and delete data** at any time

### Cost Estimates

| Item | Cost |
|---|---|
| Age gate implementation | 8--16 dev hours |
| Full COPPA consent system | 40--80 dev hours |
| COPPA compliance legal review | $5,000--$15,000 |
| FTC-approved consent provider (e.g., PRIVO) | $500--$2,000/month |

### Priority: **MUST-HAVE BEFORE LAUNCH** (age gate minimum); full COPPA compliance only if supporting child profiles

**Sources:**
- [COPPA Compliance: Key Requirements for 2026](https://usercentrics.com/knowledge-hub/coppa-compliance/)
- [FTC's 2025 COPPA Final Rule Amendments](https://securiti.ai/ftc-coppa-final-rule-amendments/)
- [COPPA Compliance in 2025: A Practical Guide](https://blog.promise.legal/startup-central/coppa-compliance-in-2025-a-practical-guide-for-tech-edtech-and-kids-apps/)

---

## 5. App Store Privacy Nutrition Labels

### Required Disclosures for FoodClaw

Apple requires **every app** to declare:
1. A **privacy policy URL** accessible from within the app
2. Completed **privacy nutrition labels** in App Store Connect
3. **Account deletion** functionality if the app allows account creation
4. A **privacy manifest file** for apps using Required Reason APIs

### Data Categories FoodClaw Must Declare

| Data Category | Specific Types | Linked to Identity? | Used for Tracking? |
|---|---|---|---|
| **Health & Fitness** | Health (medical conditions, dietary restrictions) | Yes | No (ideally) |
| **Location** | Precise/Coarse Location | Yes | Declare honestly |
| **Contact Info** | Email, Name | Yes | No |
| **Identifiers** | User ID | Yes | Declare honestly |
| **Usage Data** | Product Interaction | Yes | Declare honestly |
| **Diagnostics** | Crash Data, Performance Data | No | No |
| **User Content** | Photos (dish photos) | Yes | No |
| **Search History** | Search queries for dishes | Yes | No |

### Google Play Data Safety Section

Google requires a similar but differently structured disclosure. Key differences:
- Must declare data **sharing** (not just collection)
- Must declare **encryption in transit**
- Must declare whether data deletion is available

### Implementation Checklist

- [ ] Complete Apple **App Privacy Details** questionnaire in App Store Connect
- [ ] Complete Google Play **Data Safety** section
- [ ] Ensure **privacy policy URL** is accessible and up to date
- [ ] Implement **account deletion** feature (Apple requirement since 2022)
- [ ] Include **privacy manifest file** (`PrivacyInfo.xcprivacy`) if using Required Reason APIs
- [ ] Audit all **third-party SDKs** and include their data collection in disclosures
- [ ] Do NOT use health data for **tracking** or **third-party advertising**
- [ ] Review and update labels with **every app update** that changes data practices

### What Happens If You Get It Wrong

- Apple will **reject the app** from the App Store
- Inaccurate labels can trigger **FTC enforcement** for deceptive practices
- Users increasingly check labels before downloading; poor labels hurt conversion

### Cost Estimates

| Item | Cost |
|---|---|
| Legal review of privacy labels | $1,000--$3,000 |
| Privacy policy drafting | $2,000--$5,000 |
| Account deletion implementation | 16--24 dev hours |
| Privacy manifest setup | 4--8 dev hours |

### Priority: **MUST-HAVE BEFORE LAUNCH** (required for App Store submission)

**Sources:**
- [App Privacy Details - Apple Developer](https://developer.apple.com/app-store/app-privacy-details/)
- [Health & Fitness Apps Privacy Overview (Apple, Sept 2025)](https://www.apple.com/privacy/docs/Health_Fitness_Apps_Privacy_September_2025.pdf)

---

## 6. Database Security: PostgreSQL Encryption & Row-Level Security

### Architecture: Defense in Depth

```
[User] --> [TLS 1.3] --> [Next.js API] --> [Prisma + Field Encryption] --> [PostgreSQL + RLS + TDE]
                                                                              |
                                                                        [Encrypted at rest]
```

### Layer 1: Field-Level Encryption with Prisma

Use `prisma-field-encryption` for transparent AES-256-GCM encryption of sensitive fields:

```prisma
// prisma/schema.prisma
model User {
  id                String   @id @default(cuid())
  email             String   @unique
  name              String?

  // These fields are encrypted at the application level
  /// @encrypted
  medicalConditions String?  // "celiac,ibs,pcos"
  /// @encrypted
  foodAllergies     String?  // "peanuts,shellfish,gluten"
  /// @encrypted
  nutritionalGoals  String?  // sensitive health goals

  // Non-sensitive fields - no encryption needed
  preferredCuisines String[] // "italian,thai" - not health data
  createdAt         DateTime @default(now())
}
```

```typescript
// lib/db.ts
import { PrismaClient } from "@prisma/client";
import { fieldEncryptionExtension } from "prisma-field-encryption";

const basePrisma = new PrismaClient();

export const prisma = basePrisma.$extends(
  fieldEncryptionExtension({
    encryptionKey: process.env.PRISMA_FIELD_ENCRYPTION_KEY,
    // AES-256-GCM encryption, each field gets unique IV
  })
);
```

### Layer 2: Row-Level Security (RLS)

Prevent users from accessing other users' data at the database level:

```sql
-- Enable RLS on sensitive tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DietaryProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MedicalCondition" ENABLE ROW LEVEL SECURITY;

-- Create policy: users can only see their own data
CREATE POLICY user_isolation ON "User"
  USING (id = current_setting('app.current_user_id')::text);

CREATE POLICY dietary_isolation ON "DietaryProfile"
  USING (user_id = current_setting('app.current_user_id')::text);

-- Admin bypass for support cases (audited)
CREATE POLICY admin_access ON "User"
  USING (current_setting('app.user_role') = 'admin');
```

```typescript
// lib/db-rls.ts - Set RLS context per request
export async function withRLS<T>(
  userId: string,
  role: string,
  fn: (prisma: PrismaClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, true)`;
    await tx.$executeRaw`SELECT set_config('app.user_role', ${role}, true)`;
    return fn(tx as unknown as PrismaClient);
  });
}
```

### Layer 3: Encryption at Rest (Storage Level)

- **Managed PostgreSQL** (AWS RDS, Supabase, Neon): Encryption at rest is **enabled by default** using AES-256
- **Self-hosted**: Enable PostgreSQL Transparent Data Encryption (TDE) or use encrypted filesystem (LUKS/dm-crypt)

### Implementation Checklist

- [ ] Install and configure **`prisma-field-encryption`** for medical/allergy fields
- [ ] Generate a strong **256-bit encryption key** and store in secrets manager (not `.env`)
- [ ] Implement **key rotation** strategy (prisma-field-encryption supports multiple keys)
- [ ] Enable **PostgreSQL RLS** on all tables containing user data
- [ ] Verify **encryption at rest** is enabled on your database provider
- [ ] Enable **TLS 1.3** for all database connections (`sslmode=require`)
- [ ] Implement **database connection pooling** with PgBouncer (in transaction mode for RLS)
- [ ] Set up **database audit logging** (pgAudit extension)
- [ ] Regular **backup encryption** verification
- [ ] Implement **key management** with AWS KMS, GCP KMS, or HashiCorp Vault

### What Happens If You Get It Wrong

- A database breach exposes **plaintext medical conditions** -- triggering GDPR/FTC/state law violations
- Without RLS, a single SQL injection or broken access control exposes **all users' data**
- MyFitnessPal's lack of field-level encryption meant 150M records were immediately usable

### Cost Estimates

| Item | Cost |
|---|---|
| prisma-field-encryption | Free (open source) |
| AWS KMS / key management | $1/key/month + $0.03/10K API calls |
| Managed PostgreSQL with encryption | Included in hosting |
| pgAudit setup and log analysis | 8--16 dev hours |

### Priority: **MUST-HAVE BEFORE LAUNCH** (field encryption for medical data); RLS can be implemented in parallel with launch

**Sources:**
- [prisma-field-encryption (GitHub)](https://github.com/47ng/prisma-field-encryption)
- [PostgreSQL Row Security Policies (Docs)](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Prisma RLS Client Extensions](https://github.com/prisma/prisma-client-extensions/tree/main/row-level-security)

---

## 7. Rate Limiting & API Abuse Prevention

### Architecture with Upstash Redis

```typescript
// lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

// Different rate limits for different endpoints and user types
export const rateLimiters = {
  // Public dish browsing - generous but bounded
  dishSearch: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, "1 m"),
    prefix: "rl:dish-search",
    analytics: true,
  }),

  // Auth endpoints - strict to prevent brute force
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "15 m"),
    prefix: "rl:auth",
  }),

  // Health data access - moderate, audited
  healthData: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, "1 m"),
    prefix: "rl:health-data",
  }),

  // API scraping prevention - token bucket for burst tolerance
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.tokenBucket(10, "1 s", 100), // 10/sec, burst of 100
    prefix: "rl:api",
  }),
};

// Usage in API route
// app/api/dishes/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { rateLimiters } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? req.ip ?? "unknown";

  const { success, limit, remaining, reset } = await rateLimiters.dishSearch.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
          "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  // ... handle request
}
```

### Anti-Scraping Measures for Dish Data

```typescript
// middleware.ts - Bot detection and anti-scraping
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Block known bot user agents
  const ua = request.headers.get("user-agent") ?? "";
  const botPatterns = /bot|crawl|spider|scrape|wget|curl|python-requests/i;

  if (botPatterns.test(ua) && !isAllowedBot(ua)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Add fingerprinting headers for anomaly detection
  const response = NextResponse.next();
  response.headers.set("X-Request-ID", crypto.randomUUID());
  return response;
}
```

### Implementation Checklist

- [ ] Deploy **Upstash Redis** for distributed rate limiting
- [ ] Implement **tiered rate limits** (auth, search, API, health data)
- [ ] Return proper **429 status codes** with `Retry-After` headers
- [ ] Add **bot detection** in middleware
- [ ] Implement **API key system** for any public API access
- [ ] Add **CAPTCHA** (hCaptcha/Turnstile) on registration and login after failures
- [ ] Monitor rate limit analytics for tuning
- [ ] Implement **IP reputation checking** (optional, via Cloudflare)

### Cost Estimates

| Item | Cost |
|---|---|
| Upstash Redis (rate limiting) | Free tier: 10K commands/day; Pro: $10+/month |
| Cloudflare (WAF + bot protection) | Free tier available; Pro: $20/month |
| hCaptcha / Cloudflare Turnstile | Free for most usage |
| Implementation | 16--24 dev hours |

### Priority: **MUST-HAVE BEFORE LAUNCH** (at minimum auth rate limiting); full anti-scraping can iterate post-launch

**Sources:**
- [Rate Limiting Next.js API Routes using Upstash Redis](https://upstash.com/blog/nextjs-ratelimiting)
- [Upstash Ratelimit Algorithms](https://upstash.com/docs/redis/sdks/ratelimit-ts/algorithms)

---

## 8. OWASP Top 10 2025 Threat Analysis

### Full OWASP Top 10:2025 List and FoodClaw Relevance

| # | Category | Risk to FoodClaw | Mitigation |
|---|---|---|---|
| **A01** | Broken Access Control | **CRITICAL** - users accessing others' dietary/medical data | RLS, server-side auth checks, RBAC |
| **A02** | Security Misconfiguration | **HIGH** - default configs, exposed error messages | Security headers, env validation, disable debug in prod |
| **A03** | Software Supply Chain Failures | **HIGH** - compromised npm packages | Lock files, Dependabot, audit deps, SBOMs |
| **A04** | Cryptographic Failures | **CRITICAL** - medical data exposure | AES-256-GCM field encryption, TLS 1.3, proper key management |
| **A05** | Injection | **HIGH** - SQL injection via search/filters | Prisma parameterized queries (built-in), input validation with Zod |
| **A06** | Insecure Design | **MEDIUM** - insufficient threat modeling | DPIA, threat modeling before features |
| **A07** | Authentication Failures | **CRITICAL** - account takeover = medical data exposure | Auth.js v5, MFA, Argon2id, session management |
| **A08** | Software/Data Integrity Failures | **MEDIUM** - tampered deployments | CI/CD pipeline signing, SRI for scripts |
| **A09** | Security Logging & Alerting Failures | **HIGH** - undetected breaches | Audit logging, SIEM, alerting |
| **A10** | Mishandling Exceptional Conditions | **MEDIUM** - error messages leaking data | Custom error pages, never expose stack traces |

### Key Code Pattern: Input Validation with Zod

```typescript
// lib/validation/dish-search.ts
import { z } from "zod";

export const DishSearchSchema = z.object({
  query: z.string().min(1).max(200).trim(),
  cuisineType: z.enum(["italian", "thai", "mexican", "japanese", "indian"]).optional(),
  dietaryFilters: z.array(
    z.enum(["gluten-free", "dairy-free", "nut-free", "vegan", "vegetarian"])
  ).max(10).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radius: z.number().min(0.1).max(50).optional(), // km, capped
  page: z.number().int().min(1).max(100).default(1),
  limit: z.number().int().min(1).max(50).default(20),
});

// Usage in API route
export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const result = DishSearchSchema.safeParse(params);

  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid parameters", details: result.error.flatten() },
      { status: 400 }
    );
  }

  // Prisma parameterized queries prevent SQL injection by default
  const dishes = await prisma.dish.findMany({
    where: {
      name: { contains: result.data.query, mode: "insensitive" },
      // ... other filters
    },
    take: result.data.limit,
    skip: (result.data.page - 1) * result.data.limit,
  });
}
```

### Implementation Checklist

- [ ] **A01**: Implement RLS + server-side authorization on every data access
- [ ] **A02**: Validate all environment variables at startup; remove default credentials
- [ ] **A03**: Enable Dependabot/Snyk; use `npm audit`; generate SBOM
- [ ] **A04**: Field encryption for medical data; TLS everywhere; no MD5/SHA-1
- [ ] **A05**: Use Prisma (parameterized by default); validate all input with Zod
- [ ] **A06**: Conduct threat modeling workshop before each major feature
- [ ] **A07**: Auth.js v5 + MFA + Argon2id + account lockout
- [ ] **A08**: Pin dependencies; verify deployment integrity
- [ ] **A09**: Structured audit logging; alerting on anomalies
- [ ] **A10**: Global error handler; never expose internal errors to users

### Priority: **MUST-HAVE BEFORE LAUNCH** (A01, A04, A05, A07 are critical)

**Sources:**
- [OWASP Top 10:2025](https://owasp.org/Top10/2025/en/)
- [OWASP Top 10 2025: Key Changes (Aikido)](https://www.aikido.dev/blog/owasp-top-10-2025-changes-for-developers)

---

## 9. SOC 2 Compliance

### Do You Need SOC 2?

**Not before launch**, but plan for it. SOC 2 becomes important when:
- Enterprise customers or healthcare organizations want to integrate with you
- You process data for B2B clients
- Investors or partners ask for it (common at Series A+)

### SOC 2 Type 1 vs Type 2

| Aspect | Type 1 | Type 2 |
|---|---|---|
| What it proves | Controls exist at a point in time | Controls work over 3--12 months |
| Timeline | 1--3 months | 6--12 months |
| Cost | $20,000--$60,000 | $30,000--$150,000 |
| Enterprise acceptance | Limited | Strongly preferred |

### Cost Breakdown for a Startup (2026)

| Item | Cost Range |
|---|---|
| Compliance automation platform (Vanta, Drata, Secureframe) | $5,000--$15,000/year |
| Audit firm fees (Type 1) | $10,000--$30,000 |
| Audit firm fees (Type 2) | $15,000--$50,000 |
| Penetration testing | $5,000--$15,000/year |
| Internal team time | 100--200 hours |
| Tool implementations (SSO, MDM, etc.) | $2,000--$10,000 |
| **Total Year 1** | **$30,000--$100,000** |
| **Total Year 2+** (30--50% reduction) | **$15,000--$50,000** |

### Recommended Timeline

```
Pre-Seed / Launch:  Focus on foundational security (auth, encryption, logging)
                    These become SOC 2 evidence later

Seed Round:         Begin using Vanta/Drata to track controls automatically
                    Start 6-month observation period

Series A:           Complete SOC 2 Type 2
                    Required for enterprise health/food service customers
```

### Implementation Checklist (Start Now, Even Without SOC 2)

- [ ] Implement **access controls** and least-privilege principles
- [ ] Enable **audit logging** for all system access
- [ ] Set up **vulnerability scanning** in CI/CD
- [ ] Document **security policies** (acceptable use, incident response, data classification)
- [ ] Implement **change management** process (PR reviews, deployment approvals)
- [ ] Enable **endpoint security** for team devices
- [ ] Set up **backup and recovery** with tested restore procedures
- [ ] Implement **employee onboarding/offboarding** security procedures

### Priority: **NOT REQUIRED FOR LAUNCH** -- but build foundational controls now; pursue SOC 2 Type 2 when approaching enterprise sales or Series A

**Sources:**
- [SOC 2 Compliance Cost in 2026 (Scytale)](https://scytale.ai/center/soc-2/how-much-does-soc-2-compliance-cost/)
- [SOC 2 Compliance Roadmap for Startups](https://promise.legal/guides/soc2-roadmap)
- [SOC 2 Type 1 vs Type 2: Timelines and Costs](https://www.dsalta.com/resources/soc-2/soc-2-type-1-vs-type-2-timeline-cost-guide)

---

## 10. Location Data Privacy

### Regulatory Landscape for Location Data (2025--2026)

Location data is increasingly treated as **sensitive personal information** across jurisdictions:

**California (CCPA/CPRA + New Laws)**:
- **California Location Privacy Act (AB 1355, 2025)**: Requires a separate **"location privacy policy"** presented at the point of collection
- **AB 45 (effective January 1, 2026)**: Restricts processing of personal data collected near health care facilities
- **CCPA Risk Assessments (effective January 1, 2026)**: Requires privacy risk assessments for processing that presents "significant risk," which includes precise geolocation

**GDPR**: Location data is personal data; precise geolocation may be treated as sensitive. Requires legitimate interest assessment or consent.

### Recommended Architecture: Minimize Location Data

```typescript
// lib/location/privacy.ts

// PRINCIPLE: Collect the least precise location data needed
export function coarsenLocation(
  lat: number,
  lng: number,
  precision: 'city' | 'neighborhood' | 'exact'
): { lat: number; lng: number } {
  switch (precision) {
    case 'city':
      // Round to ~11km precision (city level)
      return {
        lat: Math.round(lat * 10) / 10,
        lng: Math.round(lng * 10) / 10,
      };
    case 'neighborhood':
      // Round to ~1.1km precision
      return {
        lat: Math.round(lat * 100) / 100,
        lng: Math.round(lng * 100) / 100,
      };
    case 'exact':
      return { lat, lng };
  }
}

// For dish discovery, neighborhood precision is sufficient
// NEVER store precise location history

export async function findNearbyDishes(
  lat: number,
  lng: number,
  radiusKm: number = 5
) {
  // Coarsen before logging/analytics
  const coarsened = coarsenLocation(lat, lng, 'neighborhood');

  // Log only coarsened location
  await logSearchEvent({
    type: 'NEARBY_SEARCH',
    location: coarsened, // NOT precise location
    radius: radiusKm,
  });

  // Use precise location only for the search query, don't persist it
  return prisma.$queryRaw`
    SELECT * FROM "Dish" d
    JOIN "Restaurant" r ON d."restaurantId" = r.id
    WHERE ST_DWithin(
      r.location::geography,
      ST_MakePoint(${lng}, ${lat})::geography,
      ${radiusKm * 1000}
    )
    LIMIT 50
  `;
}
```

### Implementation Checklist

- [ ] Implement **location consent** as a separate, explicit permission
- [ ] **Coarsen location data** before storing -- use neighborhood precision, not exact GPS
- [ ] Create a **location privacy policy** (required by California AB 1355)
- [ ] Do **NOT** store location history; use location transiently for search only
- [ ] Provide users the ability to **use the app without location** (manual city/zip entry)
- [ ] Never sell or share precise location data with third parties
- [ ] Implement **location data retention limits** (delete after session or within 24 hours)
- [ ] Disclose location data use in **App Store privacy labels** and privacy policy
- [ ] If operating near healthcare facilities, comply with **AB 45 restrictions**
- [ ] Conduct **risk assessment** if using precise geolocation (CCPA requirement effective 2026)

### What Happens If You Get It Wrong

- **CCPA/CPRA**: $2,500 per unintentional violation, $7,500 per intentional violation
- **FTC enforcement**: Multi-million dollar settlements (e.g., Kochava: $30M+ for selling precise location data)
- **Class action lawsuits**: Location data is a frequent basis for privacy class actions

### Cost Estimates

| Item | Cost |
|---|---|
| Location privacy policy (legal) | $2,000--$5,000 |
| PostGIS setup for coarsened queries | 8--16 dev hours |
| Location consent UI | 4--8 dev hours |
| CCPA risk assessment | $3,000--$10,000 |

### Priority: **MUST-HAVE BEFORE LAUNCH** (consent and data minimization)

**Sources:**
- [California Proposes CCPA Update on Location Data Rules](https://www.cyberadviserblog.com/2025/03/california-proposes-ccpa-update-on-location-data-rules/)
- [California Strengthens Privacy Protections for Health and Location Data](https://www.hunton.com/privacy-and-cybersecurity-law-blog/california-strengthens-privacy-protections-for-health-and-location-data)
- [FTC Health Breach Notification Rule](https://www.ftc.gov/business-guidance/resources/complying-ftcs-health-breach-notification-rule-0)

---

## Summary: Launch Readiness Prioritization

### MUST-HAVE BEFORE LAUNCH

| # | Item | Est. Cost | Est. Time |
|---|---|---|---|
| 1 | GDPR Article 9 explicit consent for medical dietary data | $5K--$15K legal + 24h dev | 2--3 weeks |
| 2 | Auth.js v5 with database sessions + security headers | Free + 40--80h dev | 2--4 weeks |
| 3 | Field-level encryption for medical data (prisma-field-encryption) | Free + 16h dev | 1 week |
| 4 | Input validation (Zod) on all endpoints | Free + 16h dev | 1 week |
| 5 | Age gate (COPPA minimum) | Free + 8h dev | 2--3 days |
| 6 | Rate limiting on auth and API endpoints | $10/mo Upstash + 16h dev | 1 week |
| 7 | Privacy policy + App Store privacy labels | $2K--$5K legal + 8h dev | 1--2 weeks |
| 8 | Location data consent + data minimization | $2K--$5K legal + 16h dev | 1--2 weeks |
| 9 | FTC Health Breach Notification pipeline | $1K--$3K legal + 8h dev | 1 week |
| 10 | Audit logging for data access | Free + 16h dev | 1 week |

### CAN WAIT (Post-Launch / Series A)

| # | Item | Est. Cost | When |
|---|---|---|---|
| 1 | SOC 2 Type 2 | $30K--$100K | Before enterprise sales |
| 2 | Full COPPA parental consent (if adding child profiles) | $15K--$30K | Before child feature launch |
| 3 | DPO appointment | $2K--$5K/month | When scaling in EU |
| 4 | Penetration testing | $5K--$15K/quarter | Quarterly from launch |
| 5 | PostgreSQL RLS policies | 16--24h dev | Month 1--2 post-launch |

### Total Estimated Pre-Launch Security Budget

| Category | Low Estimate | High Estimate |
|---|---|---|
| Legal (privacy, GDPR, policies) | $10,000 | $30,000 |
| Development time (200--300 hours) | $20,000 | $45,000 |
| Infrastructure (Redis, KMS, hosting) | $50/month | $200/month |
| **Total** | **$30,000** | **$75,000** |

---

## Weekly Priority Score

### Impact / Effort / Urgency Ratings

| Finding | Impact (1-5) | Effort (1-5) | Urgency (1-5) |
|---|---|---|---|
| GDPR Article 9 consent for medical data | 5 | 3 | 5 |
| Auth.js v5 + database sessions | 5 | 4 | 5 |
| Field-level encryption (prisma-field-encryption) | 5 | 2 | 5 |
| COPPA age gate | 4 | 1 | 5 |
| Rate limiting (Upstash) | 4 | 2 | 4 |
| App Store privacy labels | 4 | 2 | 5 |
| Location data minimization | 4 | 2 | 4 |
| OWASP input validation (Zod) | 5 | 2 | 5 |
| Audit logging | 4 | 3 | 3 |
| SOC 2 preparation | 3 | 5 | 1 |
