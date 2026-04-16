import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SUBSCRIBER_COUNT = 1000;
const CONTACT_REQUEST_COUNT = 50;

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
const COMPANIES = ["Acme Inc", "TechCorp", "StartupXYZ", "GlobalSoft", "InnovateLabs", "DataDrive"];
const MESSAGES = [
  "I'm interested in learning more about your services.",
  "Can we schedule a demo? Looking forward to seeing what you offer.",
  "Hi, we'd like to discuss partnership opportunities.",
  "Please contact me with pricing information.",
  "I have questions about your product features.",
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

function buildContactRequests(websiteId: string, offset: number) {
  const now = new Date();
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(now.getMonth() - 3);

  return Array.from({ length: CONTACT_REQUEST_COUNT }, (_, i) => {
    const n = offset + i + 1;
    const createdAt = randomDate(threeMonthsAgo, now);
    const isRead = Math.random() < 0.6; // 60% read

    return {
      websiteId,
      email: `contact${n}@company.com`,
      name: `Contact Person ${n}`,
      company: randomItem(COMPANIES),
      phone: `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
      message: randomItem(MESSAGES),
      timezone: randomItem(TIMEZONES),
      country: randomItem(COUNTRIES),
      browser: randomItem(BROWSERS),
      os: randomItem(OS_LIST),
      deviceType: randomItem(DEVICE_TYPES),
      createdAt,
      readAt: isRead ? randomDate(createdAt, now) : null,
    };
  });
}

async function main() {
  console.log("Seeding database…");

  // ── User + Tenant ────────────────────────────────────────────────────────
  const user = await prisma.user.upsert({
    where: { email: "seed@example.com" },
    update: {
      name: "Seed User",
      tenant: {
        upsert: {
          create: {
            fullName: "Seed User",
            email: "seed@example.com",
          },
          update: {
            fullName: "Seed User",
            email: "seed@example.com",
          },
        },
      },
    },
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
        update: {
          name: data.name,
          url: data.url,
          tenantId: tenant.id,
        },
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

  // ── Contact Requests (50 per website) ────────────────────────────────────
  for (let i = 0; i < websites.length; i++) {
    const website = websites[i]!;
    const contactRequests = buildContactRequests(website.id, i * CONTACT_REQUEST_COUNT);

    const result = await prisma.contactRequest.createMany({
      data: contactRequests,
      skipDuplicates: true,
    });

    console.log(`  Website "${website.name}": inserted ${result.count} contact requests.`);
  }

  console.log("Seeding complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
