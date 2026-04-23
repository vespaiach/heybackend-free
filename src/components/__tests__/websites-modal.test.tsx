import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { deactivateWebsite } from "@/app/dashboard/websites/actions";
import { WebsitesModal } from "@/components/websites-modal";

const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

vi.mock("@/app/dashboard/websites/actions", () => ({
  deactivateWebsite: vi.fn().mockResolvedValue({}),
}));

// Stub WebsiteFormModal to keep tests simple
vi.mock("@/components/website-form-modal", () => ({
  WebsiteFormModal: ({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) =>
    open ? (
      <div role="dialog" aria-label="website-form">
        <button type="button" onClick={() => onOpenChange(false)}>
          Close form
        </button>
      </div>
    ) : null,
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

Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});

const mockDeactivate = vi.mocked(deactivateWebsite);

const activeWebsite = {
  id: "site-abc123",
  name: "My Blog",
  url: "https://blog.com",
  key: "key-1",
  isActive: true,
};

const inactiveWebsite = {
  id: "site-xyz789",
  name: "Old Shop",
  url: "https://shop.com",
  key: "key-2",
  isActive: false,
};

describe("WebsitesModal", () => {
  beforeEach(() => {
    mockDeactivate.mockClear();
    mockRefresh.mockClear();
  });

  it("renders website names in table rows", () => {
    render(<WebsitesModal open={true} onOpenChange={vi.fn()} websites={[activeWebsite, inactiveWebsite]} />);
    expect(screen.getByText("My Blog")).toBeInTheDocument();
    expect(screen.getByText("Old Shop")).toBeInTheDocument();
  });

  it("renders website URLs as links", () => {
    render(<WebsitesModal open={true} onOpenChange={vi.fn()} websites={[activeWebsite]} />);
    const link = screen.getByRole("link", { name: "https://blog.com" });
    expect(link).toHaveAttribute("href", "https://blog.com");
  });

  it("renders truncated website ID", () => {
    render(<WebsitesModal open={true} onOpenChange={vi.fn()} websites={[activeWebsite]} />);
    expect(screen.getByText("site-abc…")).toBeInTheDocument();
  });

  it("shows empty state when websites list is empty", () => {
    render(<WebsitesModal open={true} onOpenChange={vi.fn()} websites={[]} />);
    expect(screen.getByText(/no websites yet/i)).toBeInTheDocument();
  });

  it("opens add modal when Add Website is clicked", async () => {
    render(<WebsitesModal open={true} onOpenChange={vi.fn()} websites={[activeWebsite]} />);
    await userEvent.click(screen.getByRole("button", { name: /add website/i }));
    // The stub renders hidden behind the main dialog (Radix aria-hidden), query by text
    expect(screen.getByText("Close form")).toBeInTheDocument();
  });

  it("opens rename modal when edit button is clicked", async () => {
    render(<WebsitesModal open={true} onOpenChange={vi.fn()} websites={[activeWebsite]} />);
    await userEvent.click(screen.getByRole("button", { name: /rename website/i }));
    expect(screen.getByText("Close form")).toBeInTheDocument();
  });

  it("calls deactivateWebsite and router.refresh when deactivate is clicked", async () => {
    render(<WebsitesModal open={true} onOpenChange={vi.fn()} websites={[activeWebsite]} />);
    await userEvent.click(screen.getByRole("button", { name: /deactivate website/i }));
    await userEvent.click(await screen.findByRole("button", { name: /confirm/i }));

    await waitFor(() => {
      expect(mockDeactivate).toHaveBeenCalledWith("site-abc123");
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("disables deactivate button for inactive websites", () => {
    render(<WebsitesModal open={true} onOpenChange={vi.fn()} websites={[inactiveWebsite]} />);
    expect(screen.getByRole("button", { name: /deactivate website/i })).toBeDisabled();
  });
});
