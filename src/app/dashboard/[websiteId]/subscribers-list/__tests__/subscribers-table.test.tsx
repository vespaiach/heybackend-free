import React from "react"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SubscribersTable } from "../subscribers-table"
import { formatDate } from "@/lib/utils"

const { mockPush, mockRefresh } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockRefresh: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

const {
  mockAddTag,
  mockRemoveTag,
  mockBulkUnsubscribe,
  mockBulkResubscribe,
  mockBulkAddTag,
  mockUpdateMetadata,
} = vi.hoisted(() => ({
  mockAddTag: vi.fn().mockResolvedValue({ tag: { id: "t-new", name: "VIP" } }),
  mockRemoveTag: vi.fn().mockResolvedValue({}),
  mockBulkUnsubscribe: vi.fn().mockResolvedValue({ count: 1 }),
  mockBulkResubscribe: vi.fn().mockResolvedValue({ count: 1 }),
  mockBulkAddTag: vi.fn().mockResolvedValue({ count: 1 }),
  mockUpdateMetadata: vi.fn().mockResolvedValue({}),
}))

vi.mock("../actions", () => ({
  addTagToSubscriber: mockAddTag,
  removeTagFromSubscriber: mockRemoveTag,
  bulkUnsubscribeSubscribers: mockBulkUnsubscribe,
  bulkResubscribeSubscribers: mockBulkResubscribe,
  bulkAddTag: mockBulkAddTag,
  updateSubscriberMetadata: mockUpdateMetadata,
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

const WEBSITE_ID = "site-1"
const DEFAULT_SEARCH = { q: "", status: "all" as const }

const enrichmentDefaults = {
  userAgent: null,
  referrer: null,
  timezone: null,
  locale: null,
  screenWidth: null,
  screenHeight: null,
  viewportWidth: null,
  viewportHeight: null,
  country: null,
  region: null,
  city: null,
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  utmTerm: null,
  utmContent: null,
  metadata: null,
}

const subscribers = [
  {
    id: "1",
    email: "alice@example.com",
    firstName: "Alice",
    lastName: "Smith",
    createdAt: new Date("2024-03-01"),
    unsubscribedAt: null,
    tags: [],
    ...enrichmentDefaults,
  },
  {
    id: "2",
    email: "bob@example.com",
    firstName: null,
    lastName: null,
    createdAt: new Date("2024-03-02"),
    unsubscribedAt: new Date("2024-04-01"),
    tags: [],
    ...enrichmentDefaults,
  },
]

function makeProps(overrides: Partial<React.ComponentProps<typeof SubscribersTable>> = {}) {
  return {
    selectedWebsiteId: WEBSITE_ID,
    subscribers,
    total: 2,
    page: 1,
    pageSize: 20,
    search: DEFAULT_SEARCH,
    sortField: "createdAt" as const,
    sortDir: "desc" as const,
    availableTags: [],
    selectedTagIds: [] as string[],
    websiteFields: [],
    ...overrides,
  }
}

describe("SubscribersTable", () => {
  beforeEach(() => {
    mockPush.mockClear()
    mockRefresh.mockClear()
    mockAddTag.mockClear()
    mockRemoveTag.mockClear()
    mockBulkUnsubscribe.mockClear()
    mockBulkResubscribe.mockClear()
    mockBulkAddTag.mockClear()
    mockUpdateMetadata.mockClear()
  })

  it("renders a row for each subscriber", () => {
    render(<SubscribersTable {...makeProps()} />)
    expect(screen.getByText("alice@example.com")).toBeInTheDocument()
    expect(screen.getByText("bob@example.com")).toBeInTheDocument()
  })

  it("shows empty state when no subscribers", () => {
    render(<SubscribersTable {...makeProps({ subscribers: [], total: 0 })} />)
    expect(screen.getByText(/no subscribers found/i)).toBeInTheDocument()
  })

  it("renders — for missing first/last name", () => {
    render(<SubscribersTable {...makeProps()} />)
    // Bob has no name — expect two em dashes for firstName and lastName
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2)
  })

  describe("filter popover", () => {
    it("opens the popover and shows filter fields when Filters button is clicked", async () => {
      render(<SubscribersTable {...makeProps()} />)
      await userEvent.click(screen.getByRole("button", { name: /filters/i }))
      expect(await screen.findByPlaceholderText("Name or email...")).toBeInTheDocument()
      expect(screen.getByRole("radio", { name: /^all$/i })).toBeInTheDocument()
    })

    it("typing search and clicking Apply navigates with q param and page=1", async () => {
      render(<SubscribersTable {...makeProps()} />)
      await userEvent.click(screen.getByRole("button", { name: /filters/i }))
      await userEvent.type(await screen.findByPlaceholderText("Name or email..."), "jane")
      await userEvent.click(screen.getByRole("button", { name: /^apply$/i }))
      expect(mockPush).toHaveBeenCalledOnce()
      const url = mockPush.mock.calls[0]![0] as string
      const params = new URLSearchParams(url.split("?")[1])
      expect(params.get("q")).toBe("jane")
      expect(params.get("page")).toBe("1")
      expect(params.get("wid")).toBe(WEBSITE_ID)
    })

    it("selecting status=active and clicking Apply navigates with status param", async () => {
      render(<SubscribersTable {...makeProps()} />)
      await userEvent.click(screen.getByRole("button", { name: /filters/i }))
      await userEvent.click(await screen.findByRole("radio", { name: /^active$/i }))
      await userEvent.click(screen.getByRole("button", { name: /^apply$/i }))
      const url = mockPush.mock.calls[0]![0] as string
      const params = new URLSearchParams(url.split("?")[1])
      expect(params.get("status")).toBe("active")
      expect(params.get("page")).toBe("1")
    })

    it("selecting status=all and clicking Apply omits status param", async () => {
      render(<SubscribersTable {...makeProps({ search: { q: "", status: "active" } })} />)
      await userEvent.click(screen.getByRole("button", { name: /filters/i }))
      await userEvent.click(await screen.findByRole("radio", { name: /^all$/i }))
      await userEvent.click(screen.getByRole("button", { name: /^apply$/i }))
      const url = mockPush.mock.calls[0]![0] as string
      const params = new URLSearchParams(url.split("?")[1])
      expect(params.get("status")).toBeNull()
    })

    it("selecting a tag and clicking Apply navigates with tags param", async () => {
      const availableTags = [{ id: "t1", name: "VIP", color: null, description: null }]
      render(<SubscribersTable {...makeProps({ availableTags })} />)
      await userEvent.click(screen.getByRole("button", { name: /filters/i }))
      await userEvent.click(await screen.findByRole("checkbox", { name: /^vip$/i }))
      await userEvent.click(screen.getByRole("button", { name: /^apply$/i }))
      const url = mockPush.mock.calls[0]![0] as string
      const params = new URLSearchParams(url.split("?")[1])
      expect(params.get("tags")).toBe("t1")
    })

    it("shows tag checkboxes for each available tag in the filter popover", async () => {
      const availableTags = [
        { id: "t1", name: "VIP", color: null, description: null },
        { id: "t2", name: "Beta", color: null, description: null },
      ]
      render(<SubscribersTable {...makeProps({ availableTags })} />)
      await userEvent.click(screen.getByRole("button", { name: /filters/i }))
      expect(await screen.findByRole("checkbox", { name: /^vip$/i })).toBeInTheDocument()
      expect(screen.getByRole("checkbox", { name: /^beta$/i })).toBeInTheDocument()
    })
  })

  describe("active filter chips", () => {
    it("shows no chips when no filters are active", () => {
      render(<SubscribersTable {...makeProps()} />)
      expect(screen.queryByText(/clear all/i)).not.toBeInTheDocument()
    })

    it("shows a query chip when search.q is set", () => {
      render(<SubscribersTable {...makeProps({ search: { q: "john", status: "all" } })} />)
      expect(screen.getByText(/search: john/i)).toBeInTheDocument()
    })

    it("shows a status chip when status is not 'all'", () => {
      render(<SubscribersTable {...makeProps({ search: { q: "", status: "active" } })} />)
      // The badge renders "active" text
      expect(screen.getAllByText(/^active$/i).length).toBeGreaterThanOrEqual(1)
    })

    it("shows a tag chip when selectedTagIds is set", () => {
      const availableTags = [{ id: "t1", name: "VIP", color: null, description: null }]
      render(<SubscribersTable {...makeProps({ availableTags, selectedTagIds: ["t1"] })} />)
      // Badge chip for VIP tag
      expect(screen.getAllByText("VIP").length).toBeGreaterThanOrEqual(1)
    })

    it("clicking × on query chip navigates without q param", async () => {
      render(<SubscribersTable {...makeProps({ search: { q: "john", status: "all" } })} />)
      await userEvent.click(screen.getByRole("button", { name: /remove search filter/i }))
      const url = mockPush.mock.calls[0]![0] as string
      const params = new URLSearchParams(url.split("?")[1])
      expect(params.get("q")).toBeNull()
      expect(params.get("page")).toBe("1")
    })

    it("clicking × on status chip navigates without status param", async () => {
      render(<SubscribersTable {...makeProps({ search: { q: "", status: "active" } })} />)
      await userEvent.click(screen.getByRole("button", { name: /remove status filter/i }))
      const url = mockPush.mock.calls[0]![0] as string
      const params = new URLSearchParams(url.split("?")[1])
      expect(params.get("status")).toBeNull()
    })

    it("clicking × on tag chip navigates without that tag", async () => {
      const availableTags = [{ id: "t1", name: "VIP", color: null, description: null }]
      render(<SubscribersTable {...makeProps({ availableTags, selectedTagIds: ["t1"] })} />)
      await userEvent.click(screen.getByRole("button", { name: /remove tag filter: vip/i }))
      const url = mockPush.mock.calls[0]![0] as string
      const params = new URLSearchParams(url.split("?")[1])
      expect(params.get("tags")).toBeNull()
    })

    it("clicking Reset all navigates without any filter params", async () => {
      render(<SubscribersTable {...makeProps({ search: { q: "john", status: "active" } })} />)
      await userEvent.click(screen.getByText(/clear all/i))
      const url = mockPush.mock.calls[0]![0] as string
      const params = new URLSearchParams(url.split("?")[1])
      expect(params.get("q")).toBeNull()
      expect(params.get("status")).toBeNull()
      expect(params.get("page")).toBe("1")
    })
  })

  describe("pagination", () => {
    it("does not render page nav buttons when total <= pageSize", () => {
      render(<SubscribersTable {...makeProps({ total: 20, pageSize: 20 })} />)
      expect(screen.queryByRole("button", { name: /previous page/i })).not.toBeInTheDocument()
      expect(screen.queryByRole("button", { name: /next page/i })).not.toBeInTheDocument()
    })

    it("renders page nav buttons when total > pageSize", () => {
      render(<SubscribersTable {...makeProps({ total: 21, pageSize: 20 })} />)
      expect(screen.getByRole("button", { name: /previous page/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /next page/i })).toBeInTheDocument()
    })

    it("Previous page is disabled on page 1", () => {
      render(<SubscribersTable {...makeProps({ total: 40, pageSize: 20, page: 1 })} />)
      expect(screen.getByRole("button", { name: /previous page/i })).toBeDisabled()
    })

    it("Next page is disabled on last page", () => {
      render(<SubscribersTable {...makeProps({ total: 40, pageSize: 20, page: 2 })} />)
      expect(screen.getByRole("button", { name: /next page/i })).toBeDisabled()
    })

    it("clicking Next page calls router.push with page incremented and wid preserved", async () => {
      render(
        <SubscribersTable
          {...makeProps({
            total: 40,
            pageSize: 20,
            page: 1,
            search: { q: "J", status: "all" as const },
          })}
        />
      )
      await userEvent.click(screen.getByRole("button", { name: /next page/i }))
      const url = mockPush.mock.calls[0]![0] as string
      const params = new URLSearchParams(url.split("?")[1])
      expect(params.get("page")).toBe("2")
      expect(params.get("wid")).toBe(WEBSITE_ID)
      expect(params.get("q")).toBe("J")
    })

    it("clicking Previous page calls router.push with page decremented", async () => {
      render(<SubscribersTable {...makeProps({ total: 40, pageSize: 20, page: 2 })} />)
      await userEvent.click(screen.getByRole("button", { name: /previous page/i }))
      const url = mockPush.mock.calls[0]![0] as string
      const params = new URLSearchParams(url.split("?")[1])
      expect(params.get("page")).toBe("1")
    })

    it("shows correct showing range", () => {
      render(<SubscribersTable {...makeProps({ total: 47, pageSize: 20, page: 1 })} />)
      expect(screen.getByText(/showing 1–20 of 47/i)).toBeInTheDocument()
    })

    it("shows 'No results' when total is 0", () => {
      render(<SubscribersTable {...makeProps({ subscribers: [], total: 0 })} />)
      expect(screen.getByText(/no results/i)).toBeInTheDocument()
    })

    it("clicking a numbered page button navigates to that page", async () => {
      render(<SubscribersTable {...makeProps({ total: 60, pageSize: 20, page: 1 })} />)
      await userEvent.click(screen.getByRole("button", { name: /^page 2$/i }))
      const url = mockPush.mock.calls[0]![0] as string
      const params = new URLSearchParams(url.split("?")[1])
      expect(params.get("page")).toBe("2")
    })

    it("current page button has aria-current=page", () => {
      render(<SubscribersTable {...makeProps({ total: 60, pageSize: 20, page: 2 })} />)
      expect(screen.getByRole("button", { name: /^page 2$/i })).toHaveAttribute("aria-current", "page")
    })

    it("shows ellipsis for large page counts", () => {
      // 200 total / 20 per page = 10 pages, on page 5 expect ellipsis
      render(<SubscribersTable {...makeProps({ total: 200, pageSize: 20, page: 5 })} />)
      expect(screen.getAllByText("…").length).toBeGreaterThanOrEqual(1)
    })

    it("changing rows-per-page resets to page 1 and sets pageSize param", async () => {
      render(<SubscribersTable {...makeProps({ total: 200, pageSize: 20, page: 3 })} />)
      await userEvent.selectOptions(screen.getByRole("combobox", { name: /rows per page/i }), "50")
      const url = mockPush.mock.calls[0]![0] as string
      const params = new URLSearchParams(url.split("?")[1])
      expect(params.get("pageSize")).toBe("50")
      expect(params.get("page")).toBe("1")
    })

    it("pageSize is preserved when navigating pages", async () => {
      render(<SubscribersTable {...makeProps({ total: 200, pageSize: 50, page: 1 })} />)
      await userEvent.click(screen.getByRole("button", { name: /next page/i }))
      const url = mockPush.mock.calls[0]![0] as string
      const params = new URLSearchParams(url.split("?")[1])
      expect(params.get("pageSize")).toBe("50")
    })
  })

  describe("status and actions", () => {
    it("shows — for subscriber with no unsubscribedAt", () => {
      render(<SubscribersTable {...makeProps()} />)
      // Alice has no unsubscribedAt — at least one em dash in the Unsubscribed At column
      expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1)
    })

    it("shows the unsubscribed date for subscriber with unsubscribedAt set when column is visible", async () => {
      const user = userEvent.setup()
      render(<SubscribersTable {...makeProps()} />)
      // Unsubscribed At is hidden by default — enable it via Columns toggle
      await user.click(screen.getByRole("button", { name: /columns/i }))
      await user.click(screen.getByRole("button", { name: /unsubscribed at/i }))
      // Bob unsubscribed on 2024-04-01
      expect(screen.getByText(formatDate(new Date("2024-04-01")))).toBeInTheDocument()
    })
  })

  describe("sorting", () => {
    function getSortParams(callIndex = 0) {
      const url = mockPush.mock.calls[callIndex]![0] as string
      return new URLSearchParams(url.split("?")[1])
    }

    it("clicking First Name navigates with sortField=firstName&sortDir=asc", async () => {
      render(<SubscribersTable {...makeProps({ sortField: "createdAt", sortDir: "desc" })} />)
      await userEvent.click(screen.getByRole("button", { name: /first name/i }))
      const p = getSortParams()
      expect(p.get("sortField")).toBe("firstName")
      expect(p.get("sortDir")).toBe("asc")
      expect(p.get("page")).toBe("1")
    })

    it("clicking First Name again (already active asc) navigates with sortDir=desc", async () => {
      render(<SubscribersTable {...makeProps({ sortField: "firstName", sortDir: "asc" })} />)
      await userEvent.click(screen.getByRole("button", { name: /first name/i }))
      const p = getSortParams()
      expect(p.get("sortField")).toBe("firstName")
      expect(p.get("sortDir")).toBe("desc")
    })

    it("clicking Last Name navigates with sortField=lastName&sortDir=asc", async () => {
      render(<SubscribersTable {...makeProps({ sortField: "createdAt", sortDir: "desc" })} />)
      await userEvent.click(screen.getByRole("button", { name: /last name/i }))
      const p = getSortParams()
      expect(p.get("sortField")).toBe("lastName")
      expect(p.get("sortDir")).toBe("asc")
    })

    it("clicking Subscribed At when active desc navigates with sortDir=asc", async () => {
      render(<SubscribersTable {...makeProps({ sortField: "createdAt", sortDir: "desc" })} />)
      await userEvent.click(screen.getByRole("button", { name: /subscribed at/i }))
      const p = getSortParams()
      expect(p.get("sortField")).toBe("createdAt")
      expect(p.get("sortDir")).toBe("asc")
    })

    it("sort params are preserved in wid and search when sorting", async () => {
      render(
        <SubscribersTable
          {...makeProps({
            sortField: "createdAt",
            sortDir: "desc",
            search: { q: "A", status: "all" as const },
          })}
        />
      )
      await userEvent.click(screen.getByRole("button", { name: /first name/i }))
      const p = getSortParams()
      expect(p.get("wid")).toBe(WEBSITE_ID)
      expect(p.get("q")).toBe("A")
    })
  })

  describe("tags", () => {
    it("renders tag badges when subscriber has tags", () => {
      const withTags = [
        { ...subscribers[0]!, tags: [{ id: "t1", name: "VIP", color: null, description: null }] },
      ]
      render(<SubscribersTable {...makeProps({ subscribers: withTags, total: 1 })} />)
      expect(screen.getByText("VIP")).toBeInTheDocument()
    })

    it("tags cell has a manage-tags button for each row", () => {
      render(<SubscribersTable {...makeProps()} />)
      const manageButtons = screen.getAllByRole("button", { name: /manage tags/i })
      expect(manageButtons.length).toBe(subscribers.length)
    })

    it("clicking Manage tags button in tags cell opens the dialog", async () => {
      render(<SubscribersTable {...makeProps()} />)
      const rows = screen.getAllByRole("row")
      const aliceRow = rows.find((r) => within(r).queryByText("alice@example.com"))!
      await userEvent.click(within(aliceRow).getByRole("button", { name: /manage tags/i }))
      expect(await screen.findByRole("dialog", { name: /manage tags/i })).toBeInTheDocument()
    })

    it("clicking × on a tag in the dialog calls removeTagFromSubscriber and refreshes", async () => {
      const withTags = [
        { ...subscribers[0]!, tags: [{ id: "t1", name: "VIP", color: null, description: null }] },
      ]
      render(<SubscribersTable {...makeProps({ subscribers: withTags, total: 1 })} />)
      const rows = screen.getAllByRole("row")
      const aliceRow = rows.find((r) => within(r).queryByText("alice@example.com"))!
      await userEvent.click(within(aliceRow).getByRole("button", { name: /manage tags/i }))
      await userEvent.click(await screen.findByRole("button", { name: /remove tag vip/i }))
      await waitFor(() => {
        expect(mockRemoveTag).toHaveBeenCalledWith("1", "t1")
        expect(mockRefresh).toHaveBeenCalled()
      })
    })

    it("selecting an existing tag in the dialog calls addTagToSubscriber and refreshes", async () => {
      const availableTags = [{ id: "t1", name: "VIP", color: null, description: null }]
      render(<SubscribersTable {...makeProps({ availableTags })} />)
      const rows = screen.getAllByRole("row")
      const aliceRow = rows.find((r) => within(r).queryByText("alice@example.com"))!
      await userEvent.click(within(aliceRow).getByRole("button", { name: /manage tags/i }))
      await userEvent.click(await screen.findByRole("button", { name: /^vip$/i }))
      await waitFor(() => {
        expect(mockAddTag).toHaveBeenCalledWith("1", "VIP")
        expect(mockRefresh).toHaveBeenCalled()
      })
    })

    it("typing a new tag name and clicking Create in the dialog calls addTagToSubscriber", async () => {
      render(<SubscribersTable {...makeProps()} />)
      const rows = screen.getAllByRole("row")
      const aliceRow = rows.find((r) => within(r).queryByText("alice@example.com"))!
      await userEvent.click(within(aliceRow).getByRole("button", { name: /manage tags/i }))
      await userEvent.type(await screen.findByPlaceholderText(/find or create tag/i), "Beta")
      await userEvent.click(await screen.findByRole("button", { name: /create "beta"/i }))
      await waitFor(() => {
        expect(mockAddTag).toHaveBeenCalledWith("1", "Beta")
        expect(mockRefresh).toHaveBeenCalled()
      })
    })
  })

  describe("expandable row detail", () => {
    it("renders an expand button for each row", () => {
      render(<SubscribersTable {...makeProps()} />)
      const expandButtons = screen.getAllByRole("button", { name: /expand details/i })
      expect(expandButtons.length).toBe(subscribers.length)
    })

    it("clicking the expand button shows a detail panel for that subscriber", async () => {
      const enrichedSubscribers = [
        {
          ...subscribers[0]!,
          timezone: "America/New_York",
          country: "US",
          utmSource: "newsletter",
        },
      ]
      render(<SubscribersTable {...makeProps({ subscribers: enrichedSubscribers, total: 1 })} />)
      const [expandBtn] = screen.getAllByRole("button", { name: /expand details/i })
      await userEvent.click(expandBtn!)
      expect(await screen.findByText("America/New_York")).toBeInTheDocument()
      expect(screen.getByText("US")).toBeInTheDocument()
      expect(screen.getByText("newsletter")).toBeInTheDocument()
    })

    it("clicking the expand button again collapses the detail panel", async () => {
      render(<SubscribersTable {...makeProps()} />)
      const [expandBtn] = screen.getAllByRole("button", { name: /expand details/i })
      await userEvent.click(expandBtn!)
      // Panel shows "No enrichment data captured..."
      expect(await screen.findByText(/no enrichment data captured/i)).toBeInTheDocument()
      await userEvent.click(expandBtn!)
      expect(screen.queryByText(/no enrichment data captured/i)).not.toBeInTheDocument()
    })
  })

  describe("bulk actions", () => {
    it("renders checkboxes for each row", () => {
      render(<SubscribersTable {...makeProps()} />)
      // header checkbox + 2 row checkboxes
      const checkboxes = screen.getAllByRole("checkbox")
      expect(checkboxes.length).toBeGreaterThanOrEqual(3)
    })

    it("bulk toolbar is hidden initially", () => {
      render(<SubscribersTable {...makeProps()} />)
      expect(screen.queryByText(/selected/i)).not.toBeInTheDocument()
    })

    it("selecting a row shows the bulk toolbar", async () => {
      render(<SubscribersTable {...makeProps()} />)
      const rows = screen.getAllByRole("row")
      const aliceRow = rows.find((r) => within(r).queryByText("alice@example.com"))!
      await userEvent.click(within(aliceRow).getByRole("checkbox"))
      expect(screen.getByText(/1 selected/i)).toBeInTheDocument()
    })

    it("select-all checks all rows on page", async () => {
      render(<SubscribersTable {...makeProps()} />)
      const header = screen.getAllByRole("row")[0]!
      await userEvent.click(within(header).getByRole("checkbox"))
      expect(screen.getByText(/2 selected/i)).toBeInTheDocument()
    })

    it("clicking clear selection hides the toolbar", async () => {
      render(<SubscribersTable {...makeProps()} />)
      const rows = screen.getAllByRole("row")
      const aliceRow = rows.find((r) => within(r).queryByText("alice@example.com"))!
      await userEvent.click(within(aliceRow).getByRole("checkbox"))
      await userEvent.click(screen.getByRole("button", { name: /clear selection/i }))
      expect(screen.queryByText(/selected/i)).not.toBeInTheDocument()
    })

    it("bulk unsubscribe calls bulkUnsubscribeSubscribers with selected ids and refreshes", async () => {
      render(<SubscribersTable {...makeProps()} />)
      const header = screen.getAllByRole("row")[0]!
      await userEvent.click(within(header).getByRole("checkbox"))
      await userEvent.click(screen.getByRole("button", { name: /^unsubscribe$/i }))
      await waitFor(() => {
        expect(mockBulkUnsubscribe).toHaveBeenCalledWith(expect.arrayContaining(["1", "2"]))
        expect(mockRefresh).toHaveBeenCalled()
      })
    })

    it("bulk re-subscribe calls bulkResubscribeSubscribers with selected ids and refreshes", async () => {
      render(<SubscribersTable {...makeProps()} />)
      const header = screen.getAllByRole("row")[0]!
      await userEvent.click(within(header).getByRole("checkbox"))
      await userEvent.click(screen.getByRole("button", { name: /^re-subscribe$/i }))
      await waitFor(() => {
        expect(mockBulkResubscribe).toHaveBeenCalledWith(expect.arrayContaining(["1", "2"]))
        expect(mockRefresh).toHaveBeenCalled()
      })
    })

    it("bulk add tag calls bulkAddTag with selected ids and tag name and refreshes", async () => {
      const availableTags = [{ id: "t1", name: "VIP", color: null, description: null }]
      render(<SubscribersTable {...makeProps({ availableTags })} />)
      const header = screen.getAllByRole("row")[0]!
      await userEvent.click(within(header).getByRole("checkbox"))
      // Click the bulk toolbar "Add tag" button (has visible text, not just aria-label)
      const toolbar = screen.getByText(/2 selected/).closest("div")!
      await userEvent.click(within(toolbar).getByRole("button", { name: /add tag/i }))
      await userEvent.click(await screen.findByRole("button", { name: /^vip$/i }))
      await waitFor(() => {
        expect(mockBulkAddTag).toHaveBeenCalledWith(expect.arrayContaining(["1", "2"]), "VIP")
        expect(mockRefresh).toHaveBeenCalled()
      })
    })
  })
})
