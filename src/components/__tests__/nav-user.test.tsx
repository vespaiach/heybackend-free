import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { signOut } from "next-auth/react";
import type React from "react";
import { NavUser } from "@/components/nav-user";
import { SidebarProvider } from "@/components/ui/sidebar";

vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

// jsdom does not implement matchMedia — stub it out
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

function Wrapper({ children }: { children: React.ReactNode }) {
  return <SidebarProvider>{children}</SidebarProvider>;
}

const mockSignOut = vi.mocked(signOut);

const testUser = {
  name: "Jane Smith",
  email: "jane@example.com",
  image: null,
};

describe("NavUser", () => {
  beforeEach(() => {
    mockSignOut.mockClear();
  });

  it("renders the user name and email", () => {
    render(<NavUser user={testUser} />, { wrapper: Wrapper });
    expect(screen.getAllByText("Jane Smith").length).toBeGreaterThan(0);
    expect(screen.getAllByText("jane@example.com").length).toBeGreaterThan(0);
  });

  it("shows initials in avatar fallback", () => {
    render(<NavUser user={testUser} />, { wrapper: Wrapper });
    expect(screen.getAllByText("JA").length).toBeGreaterThan(0);
  });

  it("calls signOut with /login callbackUrl when Log out is clicked", async () => {
    render(<NavUser user={testUser} />, { wrapper: Wrapper });

    // Open the dropdown
    const trigger = screen.getByRole("button");
    await userEvent.click(trigger);

    const logoutItem = await screen.findByRole("menuitem", { name: /log out/i });
    await userEvent.click(logoutItem);

    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: "/login" });
  });
});
