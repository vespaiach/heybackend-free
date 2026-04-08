// @vitest-environment node
import { createTenant } from "@/app/onboarding/actions";

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    mockRedirect(url);
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

const mockUpsertTenant = vi.fn();
const mockCreateWebsite = vi.fn();
vi.mock("@/lib/domain", () => ({
  tenantService: {
    upsertTenant: (...args: unknown[]) => mockUpsertTenant(...args),
  },
  websiteService: {
    createWebsite: (...args: unknown[]) => mockCreateWebsite(...args),
  },
}));

const AUTHED_SESSION = { user: { id: "user1", email: "jane@example.com" } };

describe("createTenant", () => {
  beforeEach(() => {
    mockRedirect.mockClear();
    mockAuth.mockClear();
    mockUpsertTenant.mockClear();
    mockCreateWebsite.mockClear();
  });

  it("redirects to /login when there is no session", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(createTenant({ fullName: "Jane", websites: [] })).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });

  it("redirects to /login when session has no email", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user1", email: null } });

    await expect(createTenant({ fullName: "Jane", websites: [] })).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });

  it("throws when fullName is empty", async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION);

    await expect(createTenant({ fullName: "", websites: [] })).rejects.toThrow();
    expect(mockUpsertTenant).not.toHaveBeenCalled();
  });

  it("throws when fullName is whitespace only", async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION);

    await expect(createTenant({ fullName: "   ", websites: [] })).rejects.toThrow();
    expect(mockUpsertTenant).not.toHaveBeenCalled();
  });

  it("calls tenantService.upsertTenant with trimmed fullName and redirects to /home when no websites provided", async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION);
    mockUpsertTenant.mockResolvedValue({ id: "tenant1", fullName: "Jane Smith" });

    await expect(createTenant({ fullName: "  Jane Smith  ", websites: [] })).rejects.toThrow(
      "NEXT_REDIRECT:/dashboard/home",
    );

    expect(mockUpsertTenant).toHaveBeenCalledWith({
      userId: "user1",
      email: "jane@example.com",
      fullName: "Jane Smith",
    });
    expect(mockCreateWebsite).not.toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard/home");
  });

  it("skips website creation when websites array is empty", async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION);
    mockUpsertTenant.mockResolvedValue({ id: "tenant1", fullName: "Jane" });

    await expect(createTenant({ fullName: "Jane", websites: [] })).rejects.toThrow(
      "NEXT_REDIRECT:/dashboard/home",
    );

    expect(mockUpsertTenant).toHaveBeenCalledWith({
      userId: "user1",
      email: "jane@example.com",
      fullName: "Jane",
    });
    expect(mockCreateWebsite).not.toHaveBeenCalled();
  });

  it("creates websites when valid websites are provided", async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION);
    mockUpsertTenant.mockResolvedValue({ id: "tenant1", fullName: "Jane" });
    mockCreateWebsite.mockResolvedValue({ id: "site1" });

    await expect(
      createTenant({ fullName: "Jane", websites: [{ name: "My Blog", url: "https://myblog.com" }] }),
    ).rejects.toThrow("NEXT_REDIRECT:/dashboard/home");

    expect(mockUpsertTenant).toHaveBeenCalledWith({
      userId: "user1",
      email: "jane@example.com",
      fullName: "Jane",
    });
    expect(mockCreateWebsite).toHaveBeenCalledWith({
      name: "My Blog",
      url: "https://myblog.com",
      tenantId: "tenant1",
    });
  });

  it("normalizes website URL to origin (strips path)", async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION);
    mockUpsertTenant.mockResolvedValue({ id: "tenant1", fullName: "Jane" });
    mockCreateWebsite.mockResolvedValue({ id: "site1" });

    await expect(
      createTenant({
        fullName: "Jane",
        websites: [{ name: "My Site", url: "https://example.com/some/path?q=1" }],
      }),
    ).rejects.toThrow("NEXT_REDIRECT:/dashboard/home");

    expect(mockCreateWebsite).toHaveBeenCalledWith({
      name: "My Site",
      url: "https://example.com",
      tenantId: "tenant1",
    });
  });

  it("throws when URL is set but name is empty", async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION);

    await expect(
      createTenant({ fullName: "Jane", websites: [{ name: "", url: "https://example.com" }] }),
    ).rejects.toThrow();

    expect(mockUpsertTenant).not.toHaveBeenCalled();
  });

  it("throws when name is set but URL is empty", async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION);

    await expect(
      createTenant({ fullName: "Jane", websites: [{ name: "My Site", url: "" }] }),
    ).rejects.toThrow();

    expect(mockUpsertTenant).not.toHaveBeenCalled();
  });

  it("throws on invalid URL", async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION);

    await expect(
      createTenant({ fullName: "Jane", websites: [{ name: "Bad", url: "not-a-url" }] }),
    ).rejects.toThrow();

    expect(mockUpsertTenant).not.toHaveBeenCalled();
  });

  it("throws when URL uses a non-http/https scheme", async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION);

    await expect(
      createTenant({ fullName: "Jane", websites: [{ name: "FTP Site", url: "ftp://example.com" }] }),
    ).rejects.toThrow();

    expect(mockUpsertTenant).not.toHaveBeenCalled();
  });
});
