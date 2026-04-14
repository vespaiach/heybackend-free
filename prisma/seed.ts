import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SUBSCRIBER_COUNT = 1000;

const COUNTRIES = ["US", "GB", "CA", "AU", "DE", "FR", "BR", "IN", "JP", "MX"];
const BROWSERS = ["Chrome", "Firefox", "Safari", "Edge"];
const OS_LIST = ["Windows", "macOS", "Linux", "iOS", "Android"];
const DEVICE_TYPES = ["desktop", "mobile", "tablet"];
const TIMEZONES = [
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Australia/Sydney",
];

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function buildSubscribers(websiteId: string, offset: number) {
  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(now.getFullYear() - 1);

  return Array.from({ length: SUBSCRIBER_COUNT }, (_, i) => {
    const n = offset + i + 1;
    const isUnsubscribed = Math.random() < 0.1; // 10% unsubscribed
    const createdAt = randomDate(oneYearAgo, now);

    return {
      email: `subscriber${n}@example.com`,
      firstName: `First${n}`,
      lastName: `Last${n}`,
      websiteId,
      timezone: randomItem(TIMEZONES),
      country: randomItem(COUNTRIES),
      browser: randomItem(BROWSERS),
      os: randomItem(OS_LIST),
      deviceType: randomItem(DEVICE_TYPES),
      createdAt,
      unsubscribedAt: isUnsubscribed ? randomDate(createdAt, now) : null,
    };
  });
}

async function main() {
  console.log("Seeding database…");

  // ── User + Tenant ────────────────────────────────────────────────────────
  const user = await prisma.user.upsert({
    where: { email: "seed@example.com" },
    update: {},
    create: {
      email: "seed@example.com",
      name: "Seed User",
      tenant: {
        create: {
          fullName: "Seed User",
          email: "seed@example.com",
        },
      },
    },
    include: { tenant: true },
  });

  console.log(`User: ${user.id} (${user.email})`);

  const tenant = user.tenant!;
  console.log(`Tenant: ${tenant.id} (${tenant.email})`);

  // ── Websites ─────────────────────────────────────────────────────────────
  const websiteData = [
    { name: "My Blog", url: "https://blog.example.com", key: "seed-site-blog-001" },
    { name: "Newsletter", url: "https://newsletter.example.com", key: "seed-site-news-001" },
  ] as const;

  const websites = await Promise.all(
    websiteData.map((data) =>
      prisma.website.upsert({
        where: { key: data.key },
        update: {},
        create: { ...data, tenantId: tenant.id },
      }),
    ),
  );

  console.log(`Created ${websites.length} websites.`);

  // ── Subscribers (1 000 per website) ──────────────────────────────────────
  for (let i = 0; i < websites.length; i++) {
    const website = websites[i]!;
    const subscribers = buildSubscribers(website.id, i * SUBSCRIBER_COUNT);

    const result = await prisma.subscriber.createMany({
      data: subscribers,
      skipDuplicates: true,
    });

    console.log(`  Website "${website.name}": inserted ${result.count} subscribers.`);
  }

  console.log("Seeding complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
