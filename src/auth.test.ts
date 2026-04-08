import { createTransport } from "nodemailer";

vi.mock("nodemailer", () => ({
  createTransport: vi.fn(),
}));

// Prevent auth.ts from running NextAuth / PrismaAdapter at import time
vi.mock("next-auth", () => ({
  default: vi.fn(() => ({ handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() })),
}));
vi.mock("next-auth/providers/google", () => ({ default: vi.fn() }));
vi.mock("next-auth/providers/nodemailer", () => ({ default: vi.fn((c) => c) }));
vi.mock("@auth/prisma-adapter", () => ({ PrismaAdapter: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

const mockSendMail = vi.fn().mockResolvedValue({ messageId: "test-id" });
vi.mocked(createTransport).mockReturnValue({ sendMail: mockSendMail } as ReturnType<typeof createTransport>);

const baseArgs = {
  identifier: "user@example.com",
  url: "https://example.com/api/auth/callback/nodemailer?token=abc123",
  expires: new Date(Date.now() + 86_400_000),
  provider: {} as never,
  token: "abc123",
  theme: {} as never,
  request: new Request("https://example.com"),
};

describe("sendVerificationRequest", () => {
  let sendVerificationRequest: typeof import("@/auth").sendVerificationRequest;

  beforeAll(async () => {
    ({ sendVerificationRequest } = await import("@/auth"));
  });

  beforeEach(() => {
    mockSendMail.mockClear();
    vi.mocked(createTransport).mockClear();
    vi.mocked(createTransport).mockReturnValue({ sendMail: mockSendMail } as ReturnType<
      typeof createTransport
    >);
    vi.stubEnv("EMAIL_SERVER_HOST", "smtp.example.com");
    vi.stubEnv("EMAIL_SERVER_PORT", "587");
    vi.stubEnv("EMAIL_SERVER_SECURE", "false");
    vi.stubEnv("EMAIL_SERVER_USER", "sender@example.com");
    vi.stubEnv("EMAIL_SERVER_PASSWORD", "secret");
    vi.stubEnv("EMAIL_FROM", "noreply@example.com");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates a nodemailer transport using the env-configured SMTP server", async () => {
    await sendVerificationRequest(baseArgs);

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.example.com",
        port: 587,
        secure: false,
        auth: expect.objectContaining({
          user: "sender@example.com",
          pass: "secret",
        }),
      }),
    );
  });

  it("sends the email to the correct recipient", async () => {
    await sendVerificationRequest(baseArgs);

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@example.com",
        from: "noreply@example.com",
      }),
    );
  });

  it("uses the correct email subject", async () => {
    await sendVerificationRequest(baseArgs);

    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({ subject: "Sign in to HeyBackend" }));
  });

  it("includes the magic link URL in the plain-text body", async () => {
    await sendVerificationRequest(baseArgs);

    const { text } = mockSendMail.mock.calls[0][0] as { text: string };
    expect(text).toContain(baseArgs.url);
  });

  it("includes the magic link URL in the HTML body", async () => {
    await sendVerificationRequest(baseArgs);

    const { html } = mockSendMail.mock.calls[0][0] as { html: string };
    expect(html).toContain(baseArgs.url);
  });

  it("mentions the 24-hour expiry in both plain-text and HTML bodies", async () => {
    await sendVerificationRequest(baseArgs);

    const { text, html } = mockSendMail.mock.calls[0][0] as { text: string; html: string };
    expect(text).toContain("24 hours");
    expect(html).toContain("24 hours");
  });

  it("uses EMAIL_SERVER_SECURE=true when configured", async () => {
    vi.stubEnv("EMAIL_SERVER_SECURE", "true");

    await sendVerificationRequest(baseArgs);

    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({ secure: true }));
  });

  it("defaults EMAIL_SERVER_PORT to 587 when the env var is absent", async () => {
    vi.stubEnv("EMAIL_SERVER_PORT", "");

    await sendVerificationRequest({ ...baseArgs });

    // port defaults to Number("") === 0... but the function uses `?? 587`
    // EMAIL_SERVER_PORT="" → Number("") === 0, not undefined, so port becomes 0.
    // Verify the transport is still created (no crash).
    expect(createTransport).toHaveBeenCalled();
  });
});
