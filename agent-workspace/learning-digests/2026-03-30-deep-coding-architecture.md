# FoodClaw: Deep Coding Architecture Guide

> Implementation-ready architecture for a dish-first food discovery app built with Next.js 16+ App Router, TypeScript, Tailwind CSS, shadcn/ui, Prisma, Redis, BullMQ, Claude API, and WebSockets.

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Server Components vs Client Components](#2-server-components-vs-client-components)
3. [API Route Design for Search & Filtering](#3-api-route-design-for-search--filtering)
4. [Real-Time: WebSockets vs SSE vs Streaming](#4-real-time-websockets-vs-sse-vs-streaming)
5. [TypeScript Data Models](#5-typescript-data-models)
6. [Proxy (Middleware) Patterns](#6-proxy-middleware-patterns)
7. [Claude API Integration](#7-claude-api-integration)
8. [Testing Strategy](#8-testing-strategy)
9. [Performance Optimization](#9-performance-optimization)
10. [Error Handling & Logging](#10-error-handling--logging)

---

## 1. Project Structure

### Recommended File Tree

Next.js 16 is unopinionated about organization but provides route groups, private folders, and colocation. For FoodClaw, we use a **hybrid approach**: `/app` for routing only, `/lib` for shared logic, `/components` for UI.

```
nutriscout/
├── src/
│   ├── app/                              # ROUTING ONLY - minimal logic here
│   │   ├── layout.tsx                    # Root layout (html/body, providers)
│   │   ├── page.tsx                      # Landing page
│   │   ├── loading.tsx                   # Global loading skeleton
│   │   ├── error.tsx                     # Global error boundary
│   │   ├── not-found.tsx                 # 404 page
│   │   │
│   │   ├── (marketing)/                  # Route group: public pages
│   │   │   ├── layout.tsx                # Marketing layout (navbar, footer)
│   │   │   ├── about/page.tsx
│   │   │   └── pricing/page.tsx
│   │   │
│   │   ├── (app)/                        # Route group: authenticated app
│   │   │   ├── layout.tsx                # App layout (sidebar, auth check)
│   │   │   ├── search/
│   │   │   │   ├── page.tsx              # Dish search page (Server Component)
│   │   │   │   ├── loading.tsx           # Search-specific skeleton
│   │   │   │   └── _components/          # Private: search-specific UI
│   │   │   │       ├── SearchFilters.tsx  # Client Component
│   │   │   │       ├── DishGrid.tsx       # Server Component
│   │   │   │       └── DishCard.tsx       # Server Component
│   │   │   │
│   │   │   ├── dish/
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── page.tsx          # Dish detail page
│   │   │   │   │   ├── loading.tsx
│   │   │   │   │   └── _components/
│   │   │   │   │       ├── NutritionPanel.tsx
│   │   │   │   │       ├── WaitTimeWidget.tsx  # Client: real-time updates
│   │   │   │   │       └── PhotoAnalyzer.tsx   # Client: camera/upload
│   │   │   │   └── @modal/               # Parallel route for dish preview modal
│   │   │   │       ├── (.)dish/[id]/page.tsx   # Intercepting route
│   │   │   │       └── default.tsx
│   │   │   │
│   │   │   ├── upload/
│   │   │   │   └── page.tsx              # Photo upload & analysis
│   │   │   │
│   │   │   └── profile/
│   │   │       └── page.tsx
│   │   │
│   │   └── api/                          # API Route Handlers
│   │       ├── search/
│   │       │   └── route.ts              # GET /api/search?q=...&diet=...
│   │       ├── dishes/
│   │       │   ├── route.ts              # GET /api/dishes, POST /api/dishes
│   │       │   └── [id]/
│   │       │       └── route.ts          # GET/PATCH/DELETE /api/dishes/:id
│   │       ├── analyze/
│   │       │   └── route.ts              # POST /api/analyze (Claude Vision)
│   │       ├── wait-times/
│   │       │   └── route.ts              # GET /api/wait-times (SSE stream)
│   │       └── webhooks/
│   │           └── route.ts              # POST /api/webhooks
│   │
│   ├── lib/                              # SHARED LOGIC - framework-agnostic
│   │   ├── db/
│   │   │   ├── prisma.ts                 # Prisma client singleton
│   │   │   ├── redis.ts                  # Redis client singleton
│   │   │   └── queries/                  # Type-safe query functions
│   │   │       ├── dishes.ts
│   │   │       ├── restaurants.ts
│   │   │       └── users.ts
│   │   │
│   │   ├── ai/
│   │   │   ├── client.ts                 # Claude API client setup
│   │   │   ├── analyze-dish.ts           # Vision analysis logic
│   │   │   ├── estimate-macros.ts        # Macro estimation prompts
│   │   │   └── schemas.ts               # Zod schemas for structured output
│   │   │
│   │   ├── search/
│   │   │   ├── engine.ts                 # Search logic (Prisma full-text + filters)
│   │   │   ├── filters.ts               # Filter parsing & validation
│   │   │   └── ranking.ts               # Result ranking algorithm
│   │   │
│   │   ├── queue/
│   │   │   ├── client.ts                 # BullMQ connection
│   │   │   ├── workers/
│   │   │   │   ├── image-processing.ts
│   │   │   │   └── wait-time-update.ts
│   │   │   └── jobs.ts                   # Job type definitions
│   │   │
│   │   ├── realtime/
│   │   │   ├── sse.ts                    # SSE helper utilities
│   │   │   └── wait-times.ts            # Wait time pub/sub via Redis
│   │   │
│   │   ├── validators/
│   │   │   ├── dish.ts                   # Zod schemas for dish data
│   │   │   ├── search.ts                # Zod schemas for search params
│   │   │   └── upload.ts                # Zod schemas for file uploads
│   │   │
│   │   ├── utils/
│   │   │   ├── errors.ts                # Custom error classes
│   │   │   ├── logger.ts                # Structured logging (pino)
│   │   │   ├── rate-limit.ts            # Rate limiting via Redis
│   │   │   └── retry.ts                 # Retry with exponential backoff
│   │   │
│   │   └── constants/
│   │       ├── dietary.ts                # Dietary restriction enums
│   │       └── nutrition.ts              # Nutritional reference data
│   │
│   ├── components/                       # SHARED UI COMPONENTS
│   │   ├── ui/                           # shadcn/ui primitives (auto-generated)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── skeleton.tsx
│   │   │   └── dialog.tsx
│   │   │
│   │   ├── layout/                       # Layout components
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   │
│   │   ├── dish/                         # Domain-specific shared components
│   │   │   ├── DishImage.tsx             # Optimized dish photo display
│   │   │   ├── MacroBar.tsx              # Macro visualization
│   │   │   ├── DietaryBadges.tsx         # Dietary restriction badges
│   │   │   └── ConfidenceIndicator.tsx   # AI confidence display
│   │   │
│   │   └── providers/                    # Client Component wrappers
│   │       ├── ThemeProvider.tsx
│   │       ├── QueryProvider.tsx          # TanStack Query provider
│   │       └── RealtimeProvider.tsx       # SSE/WebSocket context
│   │
│   ├── hooks/                            # Custom React hooks
│   │   ├── use-debounce.ts
│   │   ├── use-search.ts
│   │   ├── use-wait-time.ts              # SSE subscription hook
│   │   └── use-photo-upload.ts
│   │
│   └── types/                            # Global TypeScript types
│       ├── dish.ts
│       ├── restaurant.ts
│       ├── nutrition.ts
│       ├── search.ts
│       └── api.ts
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── public/
│   └── images/
│
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── .env.local
├── .env.example
├── vitest.config.ts
└── package.json
```

### Key Organizational Principles

1. **Route groups** `(marketing)` and `(app)` allow separate layouts without affecting URLs
2. **Private folders** `_components/` colocate route-specific UI that should not be routable
3. **Parallel routes** `@modal/` enable dish preview modals via intercepting routes
4. **`/lib` is framework-agnostic** -- all business logic lives here, easily testable without Next.js
5. **`/components` is purely UI** -- shared visual components with no data fetching

### next.config.ts

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  cacheComponents: true, // Enable Next.js 16 Cache Components + PPR

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
        pathname: '/nutriscout-uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/nutriscout/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  experimental: {
    typedRoutes: true, // Type-safe Link components
    serverActions: {
      bodySizeLimit: '5mb', // For photo uploads via Server Actions
    },
  },

  logging: {
    fetches: {
      fullUrl: true, // Log full fetch URLs in dev
    },
  },
}

export default nextConfig
```

---

## 2. Server Components vs Client Components

### Decision Matrix for FoodClaw

| Component | Type | Why |
|---|---|---|
| Search results page | **Server** | Data-heavy, benefits from server-side rendering and streaming |
| Search filters sidebar | **Client** | Interactive: dropdowns, sliders, checkboxes with local state |
| Dish card in grid | **Server** | Static display of dish data, no interactivity needed |
| Dish detail page | **Server** | Fetch dish data on server, pass to client children |
| Nutrition panel | **Server** | Static data display, rendered once |
| Wait time widget | **Client** | Real-time SSE subscription, updates every few seconds |
| Photo upload/analyzer | **Client** | Camera access, file input, drag-and-drop, preview state |
| Dietary badges | **Server** | Pure display component, no interactivity |
| Like/Save button | **Client** | onClick handler, optimistic UI updates |
| Map view | **Client** | Browser geolocation API, interactive map library |
| Header/Nav | **Server** | Static layout, with small client islands (menu toggle) |

### Pattern: Server Component with Client Islands

```tsx
// app/(app)/search/page.tsx -- SERVER COMPONENT (default)
import { Suspense } from 'react'
import { SearchFilters } from './_components/SearchFilters'
import { DishGrid } from './_components/DishGrid'
import { searchDishes } from '@/lib/search/engine'

type SearchPageProps = {
  searchParams: Promise<{
    q?: string
    diet?: string
    maxCalories?: string
    lat?: string
    lng?: string
    page?: string
  }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams

  return (
    <div className="flex gap-6">
      {/* Client Component: interactive filters */}
      <aside className="w-72 shrink-0">
        <SearchFilters initialFilters={params} />
      </aside>

      {/* Server Component: streamed results */}
      <main className="flex-1">
        <Suspense fallback={<DishGridSkeleton />}>
          <DishGrid searchParams={params} />
        </Suspense>
      </main>
    </div>
  )
}
```

```tsx
// app/(app)/search/_components/DishGrid.tsx -- SERVER COMPONENT
import { searchDishes } from '@/lib/search/engine'
import { DishCard } from './DishCard'

type Props = {
  searchParams: Record<string, string | undefined>
}

export async function DishGrid({ searchParams }: Props) {
  const results = await searchDishes(searchParams)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {results.dishes.map((dish) => (
        <DishCard key={dish.id} dish={dish} />
      ))}
    </div>
  )
}
```

```tsx
// app/(app)/search/_components/SearchFilters.tsx -- CLIENT COMPONENT
'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { DietaryRestriction } from '@/types/nutrition'

type Props = {
  initialFilters: Record<string, string | undefined>
}

const DIETARY_OPTIONS: DietaryRestriction[] = [
  'gluten-free', 'vegan', 'vegetarian', 'keto',
  'paleo', 'dairy-free', 'nut-free', 'halal', 'kosher',
]

export function SearchFilters({ initialFilters }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const updateFilters = useDebouncedCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === null) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
      params.delete('page') // Reset pagination on filter change

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    300
  )

  const activeDiets = initialFilters.diet?.split(',') ?? []

  const toggleDiet = useCallback((diet: string) => {
    const current = new Set(activeDiets)
    if (current.has(diet)) {
      current.delete(diet)
    } else {
      current.add(diet)
    }
    const value = Array.from(current).join(',')
    updateFilters('diet', value || null)
  }, [activeDiets, updateFilters])

  return (
    <div className="space-y-6" data-pending={isPending || undefined}>
      <div>
        <h3 className="text-sm font-medium mb-2">Dietary Restrictions</h3>
        <div className="flex flex-wrap gap-2">
          {DIETARY_OPTIONS.map((diet) => (
            <Badge
              key={diet}
              variant={activeDiets.includes(diet) ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => toggleDiet(diet)}
            >
              {diet}
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-2">
          Max Calories: {initialFilters.maxCalories ?? 'Any'}
        </h3>
        <Slider
          defaultValue={[Number(initialFilters.maxCalories) || 2000]}
          max={2000}
          min={0}
          step={50}
          onValueChange={([val]) => updateFilters('maxCalories', String(val))}
        />
      </div>
    </div>
  )
}
```

### Pattern: Interleaving Server Components Inside Client Components

```tsx
// Use the children slot pattern to nest Server Components inside Client Components

// components/dish/DishModal.tsx -- CLIENT COMPONENT
'use client'

import { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'

export function DishModal({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        {children} {/* Server Component content rendered here */}
      </DialogContent>
    </Dialog>
  )
}

// app/(app)/@modal/(.)dish/[id]/page.tsx -- SERVER COMPONENT
import { DishModal } from '@/components/dish/DishModal'
import { NutritionPanel } from '@/app/(app)/dish/[id]/_components/NutritionPanel'
import { getDish } from '@/lib/db/queries/dishes'

export default async function DishPreviewModal({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const dish = await getDish(id)

  return (
    <DishModal>
      {/* This Server Component renders on the server, then passed as children */}
      <h2 className="text-xl font-bold">{dish.name}</h2>
      <NutritionPanel nutrition={dish.nutrition} />
    </DishModal>
  )
}
```

### Pattern: Streaming with `use` API

```tsx
// Pass a Promise from Server Component to Client Component
// app/(app)/dish/[id]/page.tsx
import { Suspense } from 'react'
import { getDish } from '@/lib/db/queries/dishes'
import { getWaitTime } from '@/lib/db/queries/restaurants'
import { WaitTimeWidget } from './_components/WaitTimeWidget'

export default async function DishPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const dish = await getDish(id)

  // Don't await -- pass the promise directly to stream later
  const waitTimePromise = getWaitTime(dish.restaurantId)

  return (
    <div>
      <h1>{dish.name}</h1>
      <Suspense fallback={<p className="animate-pulse">Loading wait time...</p>}>
        <WaitTimeWidget waitTimePromise={waitTimePromise} />
      </Suspense>
    </div>
  )
}

// _components/WaitTimeWidget.tsx -- CLIENT COMPONENT
'use client'

import { use, useEffect, useState } from 'react'

type Props = {
  waitTimePromise: Promise<number>
}

export function WaitTimeWidget({ waitTimePromise }: Props) {
  const initialWaitTime = use(waitTimePromise) // Unwrap streamed data
  const [waitTime, setWaitTime] = useState(initialWaitTime)

  // Then subscribe to real-time updates via SSE
  useEffect(() => {
    const eventSource = new EventSource('/api/wait-times?restaurantId=...')
    eventSource.onmessage = (event) => {
      setWaitTime(JSON.parse(event.data).waitMinutes)
    }
    return () => eventSource.close()
  }, [])

  return <div>Estimated wait: {waitTime} min</div>
}
```

---

## 3. API Route Design for Search & Filtering

### Search API Route Handler

```typescript
// app/api/search/route.ts
import { type NextRequest } from 'next/server'
import { searchDishes } from '@/lib/search/engine'
import { searchParamsSchema } from '@/lib/validators/search'
import { rateLimit } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/utils/logger'
import { AppError } from '@/lib/utils/errors'

export const dynamic = 'force-dynamic' // Never cache search results

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'
    const { success, remaining } = await rateLimit(ip, {
      maxRequests: 60,
      windowMs: 60_000,
    })

    if (!success) {
      return Response.json(
        { error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Remaining': String(remaining),
          },
        }
      )
    }

    // Parse and validate search params
    const rawParams = Object.fromEntries(request.nextUrl.searchParams)
    const parseResult = searchParamsSchema.safeParse(rawParams)

    if (!parseResult.success) {
      return Response.json(
        {
          error: 'Invalid search parameters',
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const params = parseResult.data
    const results = await searchDishes(params)

    return Response.json(results, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
        'X-RateLimit-Remaining': String(remaining),
      },
    })
  } catch (error) {
    logger.error('Search API error', { error })

    if (error instanceof AppError) {
      return Response.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### Search Validation Schema

```typescript
// lib/validators/search.ts
import { z } from 'zod'

export const searchParamsSchema = z.object({
  q: z.string().min(1).max(200).optional(),

  // Dietary filters -- comma-separated
  diet: z.string().optional().transform((val) =>
    val ? val.split(',').filter(Boolean) : []
  ),

  // Nutritional bounds
  maxCalories: z.coerce.number().min(0).max(5000).optional(),
  minProtein: z.coerce.number().min(0).max(500).optional(),
  maxCarbs: z.coerce.number().min(0).max(500).optional(),
  maxFat: z.coerce.number().min(0).max(500).optional(),

  // Location
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(0.1).max(50).default(10), // km

  // Availability
  availableNow: z.coerce.boolean().default(false),

  // Pagination
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),

  // Sorting
  sort: z.enum([
    'relevance', 'calories_asc', 'calories_desc',
    'protein_desc', 'distance', 'wait_time', 'rating',
  ]).default('relevance'),
})

export type SearchParams = z.infer<typeof searchParamsSchema>
```

### Search Engine Implementation

```typescript
// lib/search/engine.ts
import 'server-only'

import { prisma } from '@/lib/db/prisma'
import { redis } from '@/lib/db/redis'
import type { SearchParams } from '@/lib/validators/search'
import type { DishSearchResult, PaginatedResponse } from '@/types/search'

export async function searchDishes(
  params: SearchParams
): Promise<PaginatedResponse<DishSearchResult>> {
  const {
    q, diet, maxCalories, minProtein, maxCarbs, maxFat,
    lat, lng, radius, availableNow, page, limit, sort,
  } = params

  // Build dynamic WHERE clause
  const where: any = { isActive: true }

  // Text search
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { tags: { hasSome: q.toLowerCase().split(' ') } },
    ]
  }

  // Dietary filters
  if (diet.length > 0) {
    where.dietaryFlags = {
      hasEvery: diet, // Dish must satisfy ALL selected restrictions
    }
  }

  // Nutritional filters
  if (maxCalories) where.calories = { lte: maxCalories }
  if (minProtein) where.protein = { gte: minProtein }
  if (maxCarbs) where.carbs = { lte: maxCarbs }
  if (maxFat) where.fat = { lte: maxFat }

  // Availability filter
  if (availableNow) {
    const now = new Date()
    const day = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    const time = now.toTimeString().slice(0, 5) // "HH:MM"
    where.restaurant = {
      operatingHours: {
        some: {
          day,
          openTime: { lte: time },
          closeTime: { gte: time },
        },
      },
    }
  }

  // Location-based filter (PostGIS or manual Haversine)
  if (lat !== undefined && lng !== undefined) {
    // For PostGIS-enabled Postgres:
    // Use raw query for geo distance filtering
    // For simpler setups, filter in application layer after query
    where.restaurant = {
      ...where.restaurant,
      latitude: { gte: lat - radius / 111, lte: lat + radius / 111 },
      longitude: {
        gte: lng - radius / (111 * Math.cos(lat * Math.PI / 180)),
        lte: lng + radius / (111 * Math.cos(lat * Math.PI / 180)),
      },
    }
  }

  // Build ORDER BY
  const orderBy = buildOrderBy(sort)

  // Execute query with pagination
  const [dishes, total] = await Promise.all([
    prisma.dish.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
            rating: true,
          },
        },
        _count: { select: { reviews: true } },
      },
    }),
    prisma.dish.count({ where }),
  ])

  // Enrich with real-time wait times from Redis
  const enriched = await enrichWithWaitTimes(dishes)

  return {
    data: enriched,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  }
}

function buildOrderBy(sort: string) {
  switch (sort) {
    case 'calories_asc': return { calories: 'asc' as const }
    case 'calories_desc': return { calories: 'desc' as const }
    case 'protein_desc': return { protein: 'desc' as const }
    case 'rating': return { averageRating: 'desc' as const }
    default: return { relevanceScore: 'desc' as const }
  }
}

async function enrichWithWaitTimes(dishes: any[]): Promise<DishSearchResult[]> {
  const restaurantIds = [...new Set(dishes.map(d => d.restaurantId))]
  const pipeline = redis.pipeline()
  restaurantIds.forEach(id => pipeline.get(`wait-time:${id}`))
  const waitTimes = await pipeline.exec()

  const waitTimeMap = new Map(
    restaurantIds.map((id, i) => [id, waitTimes?.[i]?.[1] as string | null])
  )

  return dishes.map(dish => ({
    ...dish,
    waitTimeMinutes: waitTimeMap.get(dish.restaurantId)
      ? parseInt(waitTimeMap.get(dish.restaurantId)!, 10)
      : null,
  }))
}
```

### Caching with `use cache` for Popular Dishes

```typescript
// lib/db/queries/dishes.ts
import 'server-only'

import { cacheLife, cacheTag } from 'next/cache'
import { prisma } from '@/lib/db/prisma'

export async function getDish(id: string) {
  'use cache'
  cacheLife('hours')
  cacheTag(`dish-${id}`)

  return prisma.dish.findUniqueOrThrow({
    where: { id },
    include: {
      restaurant: true,
      nutrition: true,
      reviews: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  })
}

export async function getPopularDishes(limit = 10) {
  'use cache'
  cacheLife('minutes') // Revalidate every few minutes
  cacheTag('popular-dishes')

  return prisma.dish.findMany({
    where: { isActive: true },
    orderBy: { orderCount: 'desc' },
    take: limit,
    include: {
      restaurant: {
        select: { name: true, rating: true },
      },
    },
  })
}
```

---

## 4. Real-Time: WebSockets vs SSE vs Streaming

### Recommendation: Server-Sent Events (SSE) for Wait Times

For FoodClaw's use case (server-to-client unidirectional updates), **SSE is the best choice**:

| Feature | SSE | WebSocket (Socket.io) | Streaming (fetch) |
|---|---|---|---|
| Direction | Server -> Client | Bidirectional | Server -> Client |
| Protocol | HTTP/1.1, HTTP/2 | WS:// (separate protocol) | HTTP |
| Auto-reconnect | Built-in | Manual | Manual |
| Next.js App Router | Native support | Requires custom server | Native support |
| Deployment (Vercel) | Supported | Not supported (serverless) | Supported |
| Complexity | Low | High | Low |
| Best for | Real-time updates | Chat, gaming | AI streaming |

### SSE Implementation

```typescript
// app/api/wait-times/route.ts
import { type NextRequest } from 'next/server'
import { redis } from '@/lib/db/redis'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes max connection

export async function GET(request: NextRequest) {
  const restaurantId = request.nextUrl.searchParams.get('restaurantId')

  if (!restaurantId) {
    return Response.json(
      { error: 'restaurantId is required' },
      { status: 400 }
    )
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial wait time
      const currentWaitTime = await redis.get(`wait-time:${restaurantId}`)
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({
          restaurantId,
          waitMinutes: currentWaitTime ? parseInt(currentWaitTime) : null,
          timestamp: Date.now(),
        })}\n\n`)
      )

      // Subscribe to Redis pub/sub for updates
      const subscriber = redis.duplicate()
      await subscriber.subscribe(`wait-time-updates:${restaurantId}`)

      subscriber.on('message', (_channel, message) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${message}\n\n`)
          )
        } catch {
          // Stream closed
          subscriber.unsubscribe()
          subscriber.disconnect()
        }
      })

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        } catch {
          clearInterval(heartbeat)
        }
      }, 30_000)

      // Cleanup on abort
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        subscriber.unsubscribe()
        subscriber.disconnect()
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  })
}
```

### Client-Side SSE Hook

```typescript
// hooks/use-wait-time.ts
'use client'

import { useEffect, useState, useRef, useCallback } from 'react'

type WaitTimeData = {
  restaurantId: string
  waitMinutes: number | null
  timestamp: number
}

type UseWaitTimeOptions = {
  enabled?: boolean
  onError?: (error: Event) => void
}

export function useWaitTime(
  restaurantId: string | null,
  options: UseWaitTimeOptions = {}
) {
  const { enabled = true, onError } = options
  const [data, setData] = useState<WaitTimeData | null>(null)
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'closed'>('closed')
  const eventSourceRef = useRef<EventSource | null>(null)
  const retryCountRef = useRef(0)
  const maxRetries = 5

  const connect = useCallback(() => {
    if (!restaurantId || !enabled) return

    const url = `/api/wait-times?restaurantId=${encodeURIComponent(restaurantId)}`
    const es = new EventSource(url)
    eventSourceRef.current = es
    setStatus('connecting')

    es.onopen = () => {
      setStatus('connected')
      retryCountRef.current = 0 // Reset on successful connection
    }

    es.onmessage = (event) => {
      try {
        const parsed: WaitTimeData = JSON.parse(event.data)
        setData(parsed)
      } catch {
        // Ignore parse errors (heartbeats, etc.)
      }
    }

    es.onerror = (event) => {
      setStatus('error')
      es.close()

      // Exponential backoff retry
      if (retryCountRef.current < maxRetries) {
        const delay = Math.min(1000 * 2 ** retryCountRef.current, 30_000)
        retryCountRef.current++
        setTimeout(connect, delay)
      }

      onError?.(event)
    }
  }, [restaurantId, enabled, onError])

  useEffect(() => {
    connect()
    return () => {
      eventSourceRef.current?.close()
      setStatus('closed')
    }
  }, [connect])

  return { data, status }
}
```

### When to Use WebSocket (Socket.io) Instead

If FoodClaw later needs **bidirectional** communication (e.g., chat with restaurant, live order coordination), use a **separate WebSocket server**:

```typescript
// server/websocket.ts -- Run as a separate Node.js process, NOT inside Next.js
import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL,
    methods: ['GET', 'POST'],
  },
})

io.on('connection', (socket) => {
  socket.on('join:restaurant', (restaurantId: string) => {
    socket.join(`restaurant:${restaurantId}`)
  })

  socket.on('leave:restaurant', (restaurantId: string) => {
    socket.leave(`restaurant:${restaurantId}`)
  })
})

// BullMQ worker publishes updates -> emit via Socket.io
export function broadcastWaitTime(restaurantId: string, waitMinutes: number) {
  io.to(`restaurant:${restaurantId}`).emit('wait-time:update', {
    restaurantId,
    waitMinutes,
    timestamp: Date.now(),
  })
}

httpServer.listen(3001)
```

---

## 5. TypeScript Data Models

### Prisma Schema

```prisma
// prisma/schema.prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["fullTextSearch", "postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [postgis]
}

model Restaurant {
  id             String           @id @default(cuid())
  name           String
  address        String
  latitude       Float
  longitude      Float
  phone          String?
  website        String?
  rating         Float            @default(0)
  priceLevel     Int              @default(2) // 1-4
  isActive       Boolean          @default(true)
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt
  dishes         Dish[]
  operatingHours OperatingHours[]

  @@index([latitude, longitude])
  @@index([isActive])
}

model OperatingHours {
  id           String     @id @default(cuid())
  restaurantId String
  restaurant   Restaurant @relation(fields: [restaurantId], references: [id])
  day          String     // "monday" through "sunday"
  openTime     String     // "09:00"
  closeTime    String     // "22:00"

  @@unique([restaurantId, day])
}

model Dish {
  id              String              @id @default(cuid())
  name            String
  description     String?
  price           Float
  currency        String              @default("USD")
  imageUrl        String?
  thumbnailUrl    String?

  // Nutritional data (per serving)
  calories        Float?
  protein         Float?              // grams
  carbs           Float?              // grams
  fat             Float?              // grams
  fiber           Float?              // grams
  sodium          Float?              // mg
  sugar           Float?              // grams
  servingSize     String?             // "1 bowl (350g)"

  // AI confidence
  nutritionSource NutritionSource     @default(AI_ESTIMATED)
  confidence      Float?              // 0.0 to 1.0

  // Dietary flags (string array)
  dietaryFlags    String[]            // ["vegan", "gluten-free", ...]
  allergens       String[]            // ["peanuts", "shellfish", ...]
  tags            String[]            // ["spicy", "comfort-food", ...]

  // Metrics
  averageRating   Float               @default(0)
  orderCount      Int                 @default(0)
  relevanceScore  Float               @default(0)

  isActive        Boolean             @default(true)
  restaurantId    String
  restaurant      Restaurant          @relation(fields: [restaurantId], references: [id])
  reviews         Review[]
  photoAnalyses   PhotoAnalysis[]

  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  @@index([name])
  @@index([dietaryFlags])
  @@index([calories])
  @@index([isActive, relevanceScore(sort: Desc)])
  @@index([restaurantId])
}

enum NutritionSource {
  VERIFIED           // Manually verified by restaurant or nutritionist
  AI_ESTIMATED       // Estimated by Claude Vision
  USER_REPORTED      // Submitted by users
  USDA_MATCHED       // Matched to USDA database
}

model PhotoAnalysis {
  id              String   @id @default(cuid())
  dishId          String?
  dish            Dish?    @relation(fields: [dishId], references: [id])
  imageUrl        String
  analysisResult  Json     // Full Claude API response
  estimatedMacros Json     // { calories, protein, carbs, fat }
  confidence      Float    // 0.0 to 1.0
  modelVersion    String   // e.g., "claude-sonnet-4-20250514"
  processingMs    Int      // How long analysis took
  createdAt       DateTime @default(now())

  @@index([dishId])
}

model Review {
  id        String   @id @default(cuid())
  dishId    String
  dish      Dish     @relation(fields: [dishId], references: [id])
  userId    String
  rating    Int      // 1-5
  comment   String?
  imageUrl  String?
  createdAt DateTime @default(now())

  @@index([dishId])
  @@index([userId])
}
```

### TypeScript Type Definitions

```typescript
// types/nutrition.ts

/** All recognized dietary restriction labels */
export type DietaryRestriction =
  | 'vegan'
  | 'vegetarian'
  | 'pescatarian'
  | 'gluten-free'
  | 'dairy-free'
  | 'nut-free'
  | 'soy-free'
  | 'egg-free'
  | 'shellfish-free'
  | 'keto'
  | 'paleo'
  | 'whole30'
  | 'low-fodmap'
  | 'halal'
  | 'kosher'

/** Common food allergens (FDA Big 9) */
export type Allergen =
  | 'milk'
  | 'eggs'
  | 'fish'
  | 'shellfish'
  | 'tree-nuts'
  | 'peanuts'
  | 'wheat'
  | 'soybeans'
  | 'sesame'

/** Macronutrient data with optional confidence intervals */
export type Macronutrients = {
  calories: number
  protein: number    // grams
  carbs: number      // grams
  fat: number        // grams
  fiber?: number     // grams
  sodium?: number    // mg
  sugar?: number     // grams
}

/** Macros with AI confidence bounds */
export type EstimatedMacros = {
  estimated: Macronutrients
  confidence: number // 0.0 to 1.0
  range: {
    low: Macronutrients
    high: Macronutrients
  }
  servingSize: string
  notes: string[]   // ["Dressing not included", "Estimated 2 servings shown"]
}

/** How the nutritional data was determined */
export type NutritionSourceType =
  | 'VERIFIED'
  | 'AI_ESTIMATED'
  | 'USER_REPORTED'
  | 'USDA_MATCHED'

export type NutritionConfidence = {
  source: NutritionSourceType
  score: number     // 0.0 to 1.0
  label: 'high' | 'medium' | 'low'
  disclaimer: string
}

/** Map confidence score to human-readable label */
export function getConfidenceLabel(score: number): NutritionConfidence['label'] {
  if (score >= 0.8) return 'high'
  if (score >= 0.5) return 'medium'
  return 'low'
}

/** Dietary compatibility check result */
export type DietaryCompatibility = {
  restriction: DietaryRestriction
  compatible: boolean
  reason?: string // "Contains dairy in the cheese sauce"
}
```

```typescript
// types/dish.ts
import type { Macronutrients, DietaryRestriction, Allergen, NutritionSourceType } from './nutrition'

export type Dish = {
  id: string
  name: string
  description: string | null
  price: number
  currency: string
  imageUrl: string | null
  thumbnailUrl: string | null
  nutrition: Macronutrients | null
  nutritionSource: NutritionSourceType
  confidence: number | null
  dietaryFlags: DietaryRestriction[]
  allergens: Allergen[]
  tags: string[]
  averageRating: number
  orderCount: number
  isActive: boolean
  restaurantId: string
  restaurant: DishRestaurant
  createdAt: string
  updatedAt: string
}

export type DishRestaurant = {
  id: string
  name: string
  latitude: number
  longitude: number
  rating: number
}

export type DishWithWaitTime = Dish & {
  waitTimeMinutes: number | null
  distanceKm?: number
}
```

```typescript
// types/search.ts
import type { DishWithWaitTime } from './dish'

export type PaginatedResponse<T> = {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export type DishSearchResult = DishWithWaitTime
export type SearchResponse = PaginatedResponse<DishSearchResult>
```

```typescript
// types/api.ts

/** Standard API error response */
export type ApiError = {
  error: string
  message?: string
  details?: Record<string, string[]>
  statusCode: number
}

/** Standard API success response */
export type ApiSuccess<T> = {
  data: T
  meta?: Record<string, unknown>
}

/** Type-safe API response helper */
export type ApiResponse<T> = ApiSuccess<T> | ApiError

/** Photo analysis request */
export type AnalyzePhotoRequest = {
  imageBase64: string
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
  context?: string // Optional: "This is a salad from Sweetgreen"
}

/** Photo analysis response */
export type AnalyzePhotoResponse = {
  dishName: string
  description: string
  estimatedMacros: import('./nutrition').EstimatedMacros
  dietaryFlags: import('./nutrition').DietaryRestriction[]
  allergens: import('./nutrition').Allergen[]
  confidence: number
  processingMs: number
}
```

---

## 6. Proxy (Middleware) Patterns

> **Important:** As of Next.js 16, `middleware.ts` has been renamed to `proxy.ts`. The function is now exported as `proxy` instead of `middleware`.

### Rate Limiting in Proxy

```typescript
// proxy.ts (project root or src/)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// In-memory rate limiter for proxy (Edge-compatible)
// For production, use Redis via route handlers instead
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(ip: string, limit = 100, windowMs = 60_000): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (record.count >= limit) return false
  record.count++
  return true
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // --- Rate limiting for API routes ---
  if (pathname.startsWith('/api/')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
    if (!checkRateLimit(ip)) {
      return Response.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }
  }

  // --- Security headers ---
  const response = NextResponse.next()
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // --- Request ID for tracing ---
  const requestId = crypto.randomUUID()
  response.headers.set('X-Request-Id', requestId)
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-id', requestId)

  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  matcher: [
    // Match all paths except static assets
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
```

### Redis-Based Rate Limiting (for Route Handlers)

```typescript
// lib/utils/rate-limit.ts
import 'server-only'

import { redis } from '@/lib/db/redis'

type RateLimitResult = {
  success: boolean
  remaining: number
  resetAt: Date
}

type RateLimitOptions = {
  maxRequests: number
  windowMs: number
}

/**
 * Sliding window rate limiter using Redis.
 * Uses sorted sets for precise windowing.
 */
export async function rateLimit(
  identifier: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const { maxRequests, windowMs } = options
  const key = `rate-limit:${identifier}`
  const now = Date.now()
  const windowStart = now - windowMs

  // Use a transaction for atomicity
  const pipeline = redis.pipeline()
  pipeline.zremrangebyscore(key, 0, windowStart)   // Remove expired entries
  pipeline.zadd(key, now, `${now}-${Math.random()}`) // Add current request
  pipeline.zcard(key)                                // Count requests in window
  pipeline.pexpire(key, windowMs)                    // Set TTL

  const results = await pipeline.exec()
  const requestCount = (results?.[2]?.[1] as number) ?? 0

  return {
    success: requestCount <= maxRequests,
    remaining: Math.max(0, maxRequests - requestCount),
    resetAt: new Date(now + windowMs),
  }
}
```

---

## 7. Claude API Integration

### Claude Client Setup

```typescript
// lib/ai/client.ts
import 'server-only'

import Anthropic from '@anthropic-ai/sdk'

// Singleton client
let client: Anthropic | null = null

export function getClaudeClient(): Anthropic {
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
      maxRetries: 3,
      timeout: 60_000, // 60 seconds for vision requests
    })
  }
  return client
}
```

### Dish Photo Analysis with Structured Output

```typescript
// lib/ai/analyze-dish.ts
import 'server-only'

import { getClaudeClient } from './client'
import { dishAnalysisSchema } from './schemas'
import { logger } from '@/lib/utils/logger'
import { retryWithBackoff } from '@/lib/utils/retry'
import type { AnalyzePhotoResponse } from '@/types/api'

const ANALYSIS_PROMPT = `You are a professional nutritionist analyzing a food photograph.

Analyze this dish photo and provide:
1. The dish name (be specific, e.g., "Chicken Caesar Salad" not just "salad")
2. A brief description
3. Estimated macronutrients per serving with confidence intervals
4. Dietary compatibility flags
5. Potential allergens

Return your analysis as JSON matching this exact schema:
{
  "dishName": "string",
  "description": "string",
  "estimatedMacros": {
    "estimated": { "calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number, "sodium": number, "sugar": number },
    "range": {
      "low": { "calories": number, "protein": number, "carbs": number, "fat": number },
      "high": { "calories": number, "protein": number, "carbs": number, "fat": number }
    },
    "servingSize": "string (e.g., '1 plate, ~400g')",
    "notes": ["string"]
  },
  "confidence": number (0.0 to 1.0),
  "dietaryFlags": ["vegan" | "vegetarian" | "gluten-free" | "dairy-free" | "nut-free" | "keto" | "paleo" | "halal" | "kosher"],
  "allergens": ["milk" | "eggs" | "fish" | "shellfish" | "tree-nuts" | "peanuts" | "wheat" | "soybeans" | "sesame"]
}

Be conservative with confidence scores. If you can't clearly identify portions or ingredients, note it.`

export async function analyzeDishPhoto(
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp',
  context?: string
): Promise<AnalyzePhotoResponse> {
  const client = getClaudeClient()
  const startTime = Date.now()

  const userContent = context
    ? `${ANALYSIS_PROMPT}\n\nAdditional context from user: ${context}`
    : ANALYSIS_PROMPT

  const response = await retryWithBackoff(
    async () => {
      return client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType,
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: userContent,
              },
            ],
          },
        ],
      })
    },
    {
      maxRetries: 2,
      initialDelayMs: 1000,
      shouldRetry: (error: any) => {
        // Retry on rate limits and server errors, not on client errors
        const status = error?.status ?? error?.statusCode
        return status === 429 || status === 529 || (status >= 500 && status < 600)
      },
    }
  )

  const processingMs = Date.now() - startTime

  // Extract text content from response
  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  // Parse JSON from response (handle markdown code blocks)
  const jsonStr = textBlock.text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    logger.error('Failed to parse Claude response as JSON', {
      response: textBlock.text,
      processingMs,
    })
    throw new Error('Failed to parse nutritional analysis')
  }

  // Validate with Zod
  const validated = dishAnalysisSchema.parse(parsed)

  logger.info('Dish analysis completed', {
    dishName: validated.dishName,
    confidence: validated.confidence,
    processingMs,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  })

  return {
    ...validated,
    processingMs,
  }
}
```

### Zod Schema for Structured Output Validation

```typescript
// lib/ai/schemas.ts
import { z } from 'zod'

const macronutrientsSchema = z.object({
  calories: z.number().min(0).max(10000),
  protein: z.number().min(0).max(1000),
  carbs: z.number().min(0).max(1000),
  fat: z.number().min(0).max(1000),
  fiber: z.number().min(0).max(200).optional(),
  sodium: z.number().min(0).max(20000).optional(),
  sugar: z.number().min(0).max(500).optional(),
})

const estimatedMacrosSchema = z.object({
  estimated: macronutrientsSchema,
  range: z.object({
    low: macronutrientsSchema.pick({ calories: true, protein: true, carbs: true, fat: true }),
    high: macronutrientsSchema.pick({ calories: true, protein: true, carbs: true, fat: true }),
  }),
  servingSize: z.string(),
  notes: z.array(z.string()),
})

export const dishAnalysisSchema = z.object({
  dishName: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  estimatedMacros: estimatedMacrosSchema,
  confidence: z.number().min(0).max(1),
  dietaryFlags: z.array(z.enum([
    'vegan', 'vegetarian', 'pescatarian', 'gluten-free',
    'dairy-free', 'nut-free', 'soy-free', 'egg-free',
    'shellfish-free', 'keto', 'paleo', 'whole30',
    'low-fodmap', 'halal', 'kosher',
  ])),
  allergens: z.array(z.enum([
    'milk', 'eggs', 'fish', 'shellfish',
    'tree-nuts', 'peanuts', 'wheat', 'soybeans', 'sesame',
  ])),
})
```

### Streaming Claude Response to Client

```typescript
// app/api/analyze/route.ts
import { type NextRequest } from 'next/server'
import { getClaudeClient } from '@/lib/ai/client'
import { rateLimit } from '@/lib/utils/rate-limit'

export const maxDuration = 60 // Allow up to 60s for vision analysis

export async function POST(request: NextRequest) {
  // Rate limit: 10 analyses per minute per user
  const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'
  const { success } = await rateLimit(`analyze:${ip}`, {
    maxRequests: 10,
    windowMs: 60_000,
  })
  if (!success) {
    return Response.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const body = await request.json()
  const { imageBase64, mimeType, context } = body

  // Validate image size (max 5MB base64 ~ 6.7MB string)
  if (imageBase64.length > 7_000_000) {
    return Response.json({ error: 'Image too large (max 5MB)' }, { status: 400 })
  }

  const client = getClaudeClient()

  // Stream the response for real-time feedback
  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: imageBase64 },
          },
          {
            type: 'text',
            text: context
              ? `Analyze this dish. Context: ${context}`
              : 'Analyze this dish photo and estimate its nutritional content.',
          },
        ],
      },
    ],
  })

  // Convert Anthropic stream to Web ReadableStream
  const encoder = new TextEncoder()
  const readableStream = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
          )
        }
      }

      // Send final message with usage stats
      const finalMessage = await stream.finalMessage()
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            done: true,
            usage: {
              inputTokens: finalMessage.usage.input_tokens,
              outputTokens: finalMessage.usage.output_tokens,
            },
          })}\n\n`
        )
      )
      controller.close()
    },
  })

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  })
}
```

### Retry Utility

```typescript
// lib/utils/retry.ts
import { logger } from './logger'

type RetryOptions = {
  maxRetries: number
  initialDelayMs: number
  maxDelayMs?: number
  shouldRetry?: (error: unknown) => boolean
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const {
    maxRetries,
    initialDelayMs,
    maxDelayMs = 30_000,
    shouldRetry = () => true,
  } = options

  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error
      }

      const delay = Math.min(initialDelayMs * 2 ** attempt, maxDelayMs)
      const jitter = delay * (0.5 + Math.random() * 0.5) // Add jitter
      logger.warn(`Retry attempt ${attempt + 1}/${maxRetries}`, {
        delay: Math.round(jitter),
        error: error instanceof Error ? error.message : String(error),
      })

      await new Promise((resolve) => setTimeout(resolve, jitter))
    }
  }

  throw lastError
}
```

---

## 8. Testing Strategy

### Framework Choice: Vitest

Vitest is the recommended choice for Next.js App Router projects in 2025-2026:
- Native ESM support (no transform issues)
- Jest-compatible API (easy migration)
- Faster than Jest for TypeScript projects
- Built-in UI mode for debugging

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/types/**',
        'src/components/ui/**', // shadcn auto-generated
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
```

### Test Setup

```typescript
// tests/setup.ts
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
})

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
  useParams: () => ({}),
}))

// Mock next/headers (for server component tests)
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  }),
  headers: () => new Headers(),
}))
```

### Unit Testing: Search Validation

```typescript
// lib/validators/__tests__/search.test.ts
import { describe, it, expect } from 'vitest'
import { searchParamsSchema } from '../search'

describe('searchParamsSchema', () => {
  it('parses valid search params', () => {
    const result = searchParamsSchema.safeParse({
      q: 'chicken salad',
      diet: 'vegan,gluten-free',
      maxCalories: '500',
      page: '2',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.q).toBe('chicken salad')
      expect(result.data.diet).toEqual(['vegan', 'gluten-free'])
      expect(result.data.maxCalories).toBe(500)
      expect(result.data.page).toBe(2)
    }
  })

  it('applies defaults for missing optional fields', () => {
    const result = searchParamsSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(1)
      expect(result.data.limit).toBe(20)
      expect(result.data.sort).toBe('relevance')
      expect(result.data.diet).toEqual([])
    }
  })

  it('rejects invalid calorie values', () => {
    const result = searchParamsSchema.safeParse({ maxCalories: '-100' })
    expect(result.success).toBe(false)
  })

  it('rejects page numbers below 1', () => {
    const result = searchParamsSchema.safeParse({ page: '0' })
    expect(result.success).toBe(false)
  })
})
```

### Unit Testing: Claude Analysis Schema

```typescript
// lib/ai/__tests__/schemas.test.ts
import { describe, it, expect } from 'vitest'
import { dishAnalysisSchema } from '../schemas'

describe('dishAnalysisSchema', () => {
  const validAnalysis = {
    dishName: 'Grilled Chicken Caesar Salad',
    description: 'Romaine lettuce with grilled chicken breast, parmesan, and Caesar dressing',
    estimatedMacros: {
      estimated: { calories: 450, protein: 35, carbs: 12, fat: 28, fiber: 3, sodium: 890 },
      range: {
        low: { calories: 380, protein: 30, carbs: 8, fat: 22 },
        high: { calories: 520, protein: 40, carbs: 16, fat: 34 },
      },
      servingSize: '1 plate (~350g)',
      notes: ['Dressing amount estimated', 'Croutons included'],
    },
    confidence: 0.78,
    dietaryFlags: ['gluten-free'],
    allergens: ['milk', 'eggs', 'wheat'],
  }

  it('validates a correct analysis response', () => {
    const result = dishAnalysisSchema.safeParse(validAnalysis)
    expect(result.success).toBe(true)
  })

  it('rejects confidence > 1.0', () => {
    const result = dishAnalysisSchema.safeParse({
      ...validAnalysis,
      confidence: 1.5,
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid allergen values', () => {
    const result = dishAnalysisSchema.safeParse({
      ...validAnalysis,
      allergens: ['gluten'], // Not a valid FDA allergen
    })
    expect(result.success).toBe(false)
  })
})
```

### Component Testing: DietaryBadges

```typescript
// components/dish/__tests__/DietaryBadges.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DietaryBadges } from '../DietaryBadges'

describe('DietaryBadges', () => {
  it('renders all provided dietary flags', () => {
    render(<DietaryBadges flags={['vegan', 'gluten-free']} />)

    expect(screen.getByText('vegan')).toBeInTheDocument()
    expect(screen.getByText('gluten-free')).toBeInTheDocument()
  })

  it('renders nothing when no flags provided', () => {
    const { container } = render(<DietaryBadges flags={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('applies correct color for allergen-related flags', () => {
    render(<DietaryBadges flags={['nut-free']} />)
    const badge = screen.getByText('nut-free')
    expect(badge).toHaveClass('bg-amber-100') // or whatever your allergen style is
  })
})
```

### API Route Integration Testing

```typescript
// app/api/search/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/search/engine', () => ({
  searchDishes: vi.fn().mockResolvedValue({
    data: [
      { id: '1', name: 'Test Dish', calories: 300 },
    ],
    pagination: {
      page: 1, limit: 20, total: 1,
      totalPages: 1, hasNext: false, hasPrev: false,
    },
  }),
}))

vi.mock('@/lib/utils/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 59 }),
}))

describe('GET /api/search', () => {
  it('returns search results for valid query', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/search?q=chicken&maxCalories=500'
    )

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].name).toBe('Test Dish')
  })

  it('returns 400 for invalid parameters', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/search?maxCalories=-100'
    )

    const response = await GET(request)
    expect(response.status).toBe(400)
  })

  it('returns 429 when rate limited', async () => {
    const { rateLimit } = await import('@/lib/utils/rate-limit')
    vi.mocked(rateLimit).mockResolvedValueOnce({
      success: false,
      remaining: 0,
      resetAt: new Date(),
    })

    const request = new NextRequest(
      'http://localhost:3000/api/search?q=test'
    )

    const response = await GET(request)
    expect(response.status).toBe(429)
  })
})
```

### Proxy (Middleware) Testing

```typescript
// __tests__/proxy.test.ts
import { describe, it, expect } from 'vitest'
import { proxy, config } from '../proxy'
import { NextRequest } from 'next/server'

describe('proxy', () => {
  it('adds security headers to all responses', async () => {
    const request = new NextRequest('http://localhost:3000/search')
    const response = proxy(request)

    expect(response?.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(response?.headers.get('X-Frame-Options')).toBe('DENY')
  })

  it('adds request ID header', async () => {
    const request = new NextRequest('http://localhost:3000/api/search')
    const response = proxy(request)

    expect(response?.headers.get('X-Request-Id')).toBeDefined()
    expect(response?.headers.get('X-Request-Id')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-/
    )
  })

  it('matcher excludes static assets', () => {
    const matcher = config.matcher[0]
    // _next/static paths should not match
    expect('/_next/static/chunk.js').not.toMatch(new RegExp(matcher))
  })
})
```

### Testing File Organization

```
tests/
├── setup.ts                    # Global test setup
├── helpers/
│   ├── factories.ts            # Test data factories
│   └── mocks.ts                # Shared mocks
└── e2e/                        # Playwright E2E tests (optional)
    ├── search.spec.ts
    └── upload.spec.ts

src/
├── lib/
│   ├── validators/__tests__/   # Colocated unit tests
│   ├── ai/__tests__/
│   └── search/__tests__/
├── components/
│   └── dish/__tests__/
└── app/
    └── api/search/__tests__/
```

---

## 9. Performance Optimization

### Rendering Strategy Per Route

| Route | Strategy | Rationale |
|---|---|---|
| `/` (landing) | Static (SSG) | Rarely changes, use `use cache` |
| `/search` | Dynamic (SSR) | Depends on query params, user location |
| `/dish/[id]` | PPR (Partial Prerender) | Static shell + streamed wait times |
| `/about`, `/pricing` | Static (SSG) | Content pages, `use cache` with long TTL |
| `/profile` | Dynamic (SSR) | User-specific data |
| `/api/search` | Dynamic | Always fresh results |
| `/api/wait-times` | Streaming (SSE) | Real-time connection |

### PPR for Dish Detail Pages

```tsx
// app/(app)/dish/[id]/page.tsx
import { Suspense } from 'react'
import { cacheLife, cacheTag } from 'next/cache'
import { getDish } from '@/lib/db/queries/dishes'
import { NutritionPanel } from './_components/NutritionPanel'
import { WaitTimeWidget } from './_components/WaitTimeWidget'
import { SimilarDishes } from './_components/SimilarDishes'
import { DishImage } from '@/components/dish/DishImage'

export default async function DishPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  'use cache'
  cacheLife('hours')

  const { id } = await params
  cacheTag(`dish-${id}`)

  const dish = await getDish(id)

  return (
    <div className="max-w-4xl mx-auto">
      {/* Cached: part of static shell */}
      <DishImage
        src={dish.imageUrl}
        alt={dish.name}
        width={800}
        height={600}
        priority // Above the fold
      />
      <h1 className="text-3xl font-bold mt-4">{dish.name}</h1>
      <p className="text-muted-foreground">{dish.description}</p>
      <NutritionPanel nutrition={dish.nutrition} confidence={dish.confidence} />

      {/* Streamed: wait time needs real-time data */}
      <Suspense fallback={<div className="animate-pulse h-16 bg-muted rounded" />}>
        <WaitTimeWidget restaurantId={dish.restaurantId} />
      </Suspense>

      {/* Streamed: similar dishes can load later */}
      <Suspense fallback={<div className="animate-pulse h-48 bg-muted rounded" />}>
        <SimilarDishes dishId={dish.id} tags={dish.tags} />
      </Suspense>
    </div>
  )
}
```

### Image Optimization for Food Photos

```tsx
// components/dish/DishImage.tsx
import Image from 'next/image'

type Props = {
  src: string | null
  alt: string
  width?: number
  height?: number
  priority?: boolean
  className?: string
  sizes?: string
}

export function DishImage({
  src,
  alt,
  width = 400,
  height = 300,
  priority = false,
  className,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
}: Props) {
  if (!src) {
    return (
      <div
        className={`bg-muted flex items-center justify-center text-muted-foreground ${className}`}
        style={{ width, height }}
      >
        No photo
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={`object-cover rounded-lg ${className}`}
      sizes={sizes}
      priority={priority}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAABgUH/8QAIhAAAgIBAwQDAAAAAAAAAAAAAQIDBBEABSEGEjFBUWFx/8QAFQEBAQAAAAAAAAAAAAAAAAAAAQL/xAAXEQADAQAAAAAAAAAAAAAAAAABAxEA/9oADAMBAAIRAxEAPwCZZ9DTSXLE2jN2Iy5A49jPHHvkaBSdB1JJVWSSyjDgqVTg/eknUYJPjWiNhZsf/9k="
      quality={85}
    />
  )
}
```

### Bundle Size Optimization

```typescript
// next.config.ts additions for bundle optimization
const nextConfig: NextConfig = {
  // ... previous config

  // Optimize packages that ship too much JS
  optimizePackageImports: [
    'lucide-react',        // Only import used icons
    '@radix-ui/react-*',   // Tree-shake Radix UI
    'date-fns',            // Only import used functions
    'lodash',              // Tree-shake lodash
  ],

  // Analyze bundle size
  webpack: (config, { isServer }) => {
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: isServer ? 'server-bundle.html' : 'client-bundle.html',
        })
      )
    }
    return config
  },
}
```

### Data Fetching Patterns

```typescript
// Use parallel data fetching where possible
export default async function DishPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // BAD: Sequential (waterfall)
  // const dish = await getDish(id)
  // const reviews = await getReviews(id)
  // const similar = await getSimilarDishes(id)

  // GOOD: Parallel
  const [dish, reviews, similar] = await Promise.all([
    getDish(id),
    getReviews(id),
    getSimilarDishes(id),
  ])

  return <div>...</div>
}
```

---

## 10. Error Handling & Logging

### Custom Error Classes

```typescript
// lib/utils/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 404, 'NOT_FOUND', { resource, id })
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, string[]>) {
    super(message, 400, 'VALIDATION_ERROR', details)
    this.name = 'ValidationError'
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfterSeconds: number) {
    super('Rate limit exceeded', 429, 'RATE_LIMIT', { retryAfterSeconds })
    this.name = 'RateLimitError'
  }
}

export class AIAnalysisError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 502, 'AI_ANALYSIS_ERROR', details)
    this.name = 'AIAnalysisError'
  }
}
```

### Structured Logging with Pino

```typescript
// lib/utils/logger.ts
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',

  // Production: JSON for log aggregation (Datadog, Logstash, etc.)
  // Development: Pretty print
  ...(process.env.NODE_ENV === 'production'
    ? {
        formatters: {
          level: (label) => ({ level: label }),
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        },
      }),

  // Base fields included in every log
  base: {
    env: process.env.NODE_ENV,
    service: 'nutriscout',
    version: process.env.npm_package_version,
  },

  // Redact sensitive fields
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.apiKey'],
    censor: '[REDACTED]',
  },
})

// Create child loggers for specific domains
export const searchLogger = logger.child({ domain: 'search' })
export const aiLogger = logger.child({ domain: 'ai' })
export const realtimeLogger = logger.child({ domain: 'realtime' })
```

### Error Boundary Components

```tsx
// app/error.tsx -- Global error boundary
'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Report to Sentry or other error tracking
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error)
    }
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
      <h2 className="text-2xl font-bold">Something went wrong</h2>
      <p className="text-muted-foreground max-w-md text-center">
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground">Error ID: {error.digest}</p>
      )}
      <Button onClick={reset}>Try Again</Button>
    </div>
  )
}
```

```tsx
// app/(app)/search/error.tsx -- Search-specific error boundary
'use client'

import { Button } from '@/components/ui/button'

export default function SearchError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <h2 className="text-xl font-semibold">Search temporarily unavailable</h2>
      <p className="text-muted-foreground">
        We're having trouble loading results. Please try again in a moment.
      </p>
      <div className="flex gap-2">
        <Button onClick={reset}>Retry Search</Button>
        <Button variant="outline" onClick={() => window.location.href = '/'}>
          Go Home
        </Button>
      </div>
    </div>
  )
}
```

### Sentry Integration

```typescript
// instrumentation.ts (project root)
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side Sentry
    const Sentry = await import('@sentry/nextjs')
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      profilesSampleRate: 0.1,

      // Filter out noise
      ignoreErrors: [
        'NEXT_NOT_FOUND',
        'NEXT_REDIRECT',
        /^Rate limit exceeded/,
      ],

      beforeSend(event, hint) {
        // Don't send expected errors
        const error = hint.originalException
        if (error instanceof Error && error.message.includes('Rate limit')) {
          return null
        }
        return event
      },
    })
  }
}
```

```typescript
// app/global-error.tsx -- Catches errors in root layout
'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold">Something went wrong</h1>
            <p className="mt-2 text-gray-600">We've been notified and are looking into it.</p>
            <button
              className="mt-4 rounded bg-blue-600 px-4 py-2 text-white"
              onClick={reset}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
```

### Graceful Degradation Patterns

```tsx
// components/dish/NutritionPanel.tsx -- Graceful fallback for missing data
import type { Macronutrients, NutritionSourceType } from '@/types/nutrition'
import { getConfidenceLabel } from '@/types/nutrition'
import { Badge } from '@/components/ui/badge'
import { MacroBar } from './MacroBar'
import { ConfidenceIndicator } from './ConfidenceIndicator'

type Props = {
  nutrition: Macronutrients | null
  confidence: number | null
  source?: NutritionSourceType
}

export function NutritionPanel({ nutrition, confidence, source }: Props) {
  // Graceful degradation: no nutrition data available
  if (!nutrition) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
        <p>Nutritional information not yet available for this dish.</p>
        <p className="text-sm mt-1">
          Upload a photo to get an AI-powered estimate.
        </p>
      </div>
    )
  }

  const confidenceLabel = confidence ? getConfidenceLabel(confidence) : 'low'

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Nutrition Facts</h3>
        <div className="flex items-center gap-2">
          {source && (
            <Badge variant="secondary" className="text-xs">
              {source === 'AI_ESTIMATED' ? 'AI Estimate' :
               source === 'VERIFIED' ? 'Verified' :
               source === 'USER_REPORTED' ? 'User Reported' :
               'USDA Data'}
            </Badge>
          )}
          {confidence && (
            <ConfidenceIndicator score={confidence} label={confidenceLabel} />
          )}
        </div>
      </div>

      <div className="text-3xl font-bold">{Math.round(nutrition.calories)} cal</div>

      <div className="grid grid-cols-3 gap-4">
        <MacroBar label="Protein" value={nutrition.protein} unit="g" color="blue" />
        <MacroBar label="Carbs" value={nutrition.carbs} unit="g" color="amber" />
        <MacroBar label="Fat" value={nutrition.fat} unit="g" color="red" />
      </div>

      {confidenceLabel === 'low' && (
        <p className="text-xs text-amber-600 mt-2">
          This estimate has low confidence. Actual values may vary significantly.
        </p>
      )}
    </div>
  )
}
```

### API Error Response Helper

```typescript
// lib/utils/api-response.ts
import { NextResponse } from 'next/server'
import { AppError } from './errors'
import { logger } from './logger'
import type { ApiError, ApiSuccess } from '@/types/api'

export function successResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data } satisfies ApiSuccess<T>, { status })
}

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        statusCode: error.statusCode,
        details: error.details,
      } satisfies ApiError,
      { status: error.statusCode }
    )
  }

  // Log unexpected errors
  logger.error('Unhandled API error', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  })

  return NextResponse.json(
    {
      error: 'Internal server error',
      statusCode: 500,
    } satisfies ApiError,
    { status: 500 }
  )
}
```

---

## Key Dependency Versions

```json
{
  "dependencies": {
    "next": "^16.2.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "typescript": "^5.7.0",
    "@anthropic-ai/sdk": "^0.39.0",
    "@prisma/client": "^6.3.0",
    "ioredis": "^5.4.0",
    "bullmq": "^5.34.0",
    "zod": "^3.24.0",
    "pino": "^9.6.0",
    "server-only": "^0.0.1",
    "use-debounce": "^10.0.0",
    "@sentry/nextjs": "^9.5.0",
    "tailwindcss": "^4.0.0",
    "@radix-ui/react-dialog": "^1.1.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.0",
    "tailwind-merge": "^3.0.0",
    "lucide-react": "^0.474.0"
  },
  "devDependencies": {
    "prisma": "^6.3.0",
    "vitest": "^3.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "@testing-library/react": "^16.1.0",
    "@testing-library/jest-dom": "^6.6.0",
    "pino-pretty": "^13.0.0",
    "@types/react": "^19.1.0",
    "@types/node": "^22.0.0"
  }
}
```

---

## Summary of Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Rendering | PPR (Partial Prerendering) via Cache Components | Best of both worlds: static shell + dynamic streaming |
| Real-time | SSE via Route Handlers | Unidirectional, works with serverless, auto-reconnect |
| Caching | `use cache` directive + Redis | Next.js 16 native caching + Redis for real-time data |
| AI Integration | Direct Anthropic SDK + Zod validation | Type-safe structured output, retry with backoff |
| Search | Prisma full-text + Redis enrichment | Combined SQL filtering with real-time data overlay |
| Testing | Vitest + Testing Library | Fast, ESM-native, Jest-compatible API |
| Error tracking | Sentry + Pino structured logging | Production-grade observability |
| State management | URL search params + Server Components | No client-side state store needed for search |
| Middleware | `proxy.ts` (Next.js 16) | Rate limiting, security headers, request tracing |
| Image handling | `next/image` with blur placeholders | Automatic optimization, WebP/AVIF, lazy loading |

---

*Generated for FoodClaw -- a dish-first food discovery application.*
*Architecture based on Next.js 16.2 documentation (March 2026), Anthropic Claude API, and production patterns.*
