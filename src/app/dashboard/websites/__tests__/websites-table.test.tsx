import React from "react"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { WebsitesTable } from "../websites-table"
import { deactivateWebsite } from "../actions"
import { toast } from "sonner"

// vi.hoisted lets us reference these in the vi.mock factory below
const { mockRefresh, mockReplace } = vi.hoisted(() => ({
  mockRefresh: vi.fn(),
  mockReplace: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh, replace: mockReplace }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("../actions", () => ({
  deactivateWebsite: vi.fn().mockResolvedValue({}),
}))

vi.mock("sonner", () => ({
  toast: vi.fn(),
}))

// Stub WebsiteFormModal to avoid rendering its internals in table tests
vi.mock("@/components/website-form-modal", () => ({
  WebsiteFormModal: ({ open, website }: { open: boolean; website?: { name: string } | null }) =>
    open ? <div data-testid="form-modal">{website ? `Editing ${website.name}` : "Add modal"}</div> : null,
}))

// jsdom does not implement matchMedia
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
})

const mockWriteText = vi.fn().mockResolvedValue(undefined)
Object.defineProperty(navigator, "clipboard", {
  value: { writeText: mockWriteText },
  writable: true,
  configurable: true,
})

const mockDeactivate = vi.mocked(deactivateWebsite)
const mockToast = vi.mocked(toast)

const websites = [
  {
    id: "1",
    name: "Alpha",
    url: "https://alpha.com",
    key: "key-alpha",
    isActive: true,
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "2",
    name: "Beta",
    url: "https://beta.com",
    key: "key-beta",
    isActive: false,
    createdAt: new Date("2024-01-03"),
  },
  {
    id: "3",
    name: "Gamma",
    url: "https://gamma.com",
    key: "key-gamma",
    isActive: true,
    createdAt: new Date("2024-01-02"),
  },
]

describe("WebsitesTable", () => {
  beforeEach(() => {
    mockDeactivate.mockClear()
    mockToast.mockClear()
    mockWriteText.mockClear()
    mockRefresh.mockClear()
    mockReplace.mockClear()
  })

  it("shows empty state when no websites", () => {
    render(<WebsitesTable websites={[]} />)
    expect(screen.getByText(/no websites yet/i)).toBeInTheDocument()
  })

  it("renders a row for each website", () => {
    render(<WebsitesTable websites={websites} />)
    expect(screen.getByText("Alpha")).toBeInTheDocument()
    expect(screen.getByText("Beta")).toBeInTheDocument()
    expect(screen.getByText("Gamma")).toBeInTheDocument()
  })

  it("renders URL as a link that opens in a new tab", () => {
    render(<WebsitesTable websites={[websites[0]]} />)
    const link = screen.getByRole("link", { name: "https://alpha.com" })
    expect(link).toHaveAttribute("href", "https://alpha.com")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
  })

  it("renders masked API key for each row", () => {
    render(<WebsitesTable websites={[websites[0]]} />)
    expect(screen.getByText("•••••••••")).toBeInTheDocument()
  })

  it("applies line-through styling to inactive websites", () => {
    render(<WebsitesTable websites={websites} />)
    expect(screen.getByText("Beta")).toHaveClass("line-through")
  })

  it("does not apply line-through to active websites", () => {
    render(<WebsitesTable websites={websites} />)
    expect(screen.getByText("Alpha")).not.toHaveClass("line-through")
  })

  it("defaults to createdAt descending order (newest first)", () => {
    render(<WebsitesTable websites={websites} />)
    const rows = screen.getAllByRole("row").slice(1) // skip header row
    // Beta Jan 3 > Gamma Jan 2 > Alpha Jan 1
    expect(within(rows[0]).getByText("Beta")).toBeInTheDocument()
    expect(within(rows[1]).getByText("Gamma")).toBeInTheDocument()
    expect(within(rows[2]).getByText("Alpha")).toBeInTheDocument()
  })

  it("sorts by name ascending on first Name header click", async () => {
    render(<WebsitesTable websites={websites} />)
    await userEvent.click(screen.getByRole("button", { name: /name/i }))

    const rows = screen.getAllByRole("row").slice(1)
    expect(within(rows[0]).getByText("Alpha")).toBeInTheDocument()
    expect(within(rows[1]).getByText("Beta")).toBeInTheDocument()
    expect(within(rows[2]).getByText("Gamma")).toBeInTheDocument()
  })

  it("sorts by name descending on second Name header click", async () => {
    render(<WebsitesTable websites={websites} />)
    await userEvent.click(screen.getByRole("button", { name: /name/i }))
    await userEvent.click(screen.getByRole("button", { name: /name/i }))

    const rows = screen.getAllByRole("row").slice(1)
    expect(within(rows[0]).getByText("Gamma")).toBeInTheDocument()
    expect(within(rows[1]).getByText("Beta")).toBeInTheDocument()
    expect(within(rows[2]).getByText("Alpha")).toBeInTheDocument()
  })

  it("inline copy button writes the key to clipboard and shows toast", async () => {
    render(<WebsitesTable websites={[websites[0]]} />)
    await userEvent.click(screen.getByRole("button", { name: /copy api key/i }))

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith("key-alpha")
      expect(mockToast).toHaveBeenCalledWith("Copied!")
    })
  })

  it("opens add modal when Add Website button is clicked", async () => {
    render(<WebsitesTable websites={websites} />)
    await userEvent.click(screen.getByRole("button", { name: /add website/i }))
    expect(screen.getByTestId("form-modal")).toHaveTextContent("Add modal")
  })

  describe("row dropdown menu", () => {
    async function openMenuFor(websiteName: string) {
      const rows = screen.getAllByRole("row")
      const row = rows.find((r) => within(r).queryByText(websiteName))!
      await userEvent.click(within(row).getByRole("button", { name: /open menu/i }))
    }

    it("Edit opens modal pre-loaded with the selected website", async () => {
      render(<WebsitesTable websites={websites} />)
      await openMenuFor("Alpha")
      await userEvent.click(await screen.findByRole("menuitem", { name: /edit/i }))
      expect(screen.getByTestId("form-modal")).toHaveTextContent("Editing Alpha")
    })

    it("Copy Key writes the correct key to clipboard and shows toast", async () => {
      render(<WebsitesTable websites={websites} />)
      await openMenuFor("Alpha")
      await userEvent.click(await screen.findByRole("menuitem", { name: /copy key/i }))

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith("key-alpha")
        expect(mockToast).toHaveBeenCalledWith("Copied!")
      })
    })

    it("Deactivate calls deactivateWebsite with the website id and refreshes", async () => {
      render(<WebsitesTable websites={websites} />)
      await openMenuFor("Alpha")
      await userEvent.click(await screen.findByRole("menuitem", { name: /deactivate/i }))

      await waitFor(() => {
        expect(mockDeactivate).toHaveBeenCalledWith("1")
        expect(mockRefresh).toHaveBeenCalled()
      })
    })

    it("Deactivate is disabled for already inactive websites", async () => {
      render(<WebsitesTable websites={websites} />)
      await openMenuFor("Beta")
      const deactivateItem = await screen.findByRole("menuitem", { name: /deactivate/i })
      expect(deactivateItem).toHaveAttribute("aria-disabled", "true")
    })
  })
})
