import { render, screen } from "@testing-library/react";
import type { FeedEvent } from "../activity-feed";
import { ActivityFeedView, mergeFeedEvents } from "../activity-feed";

vi.mock("@/components/relative-date", () => ({
  RelativeDate: ({ date }: { date: Date }) => <span data-testid="relative-date">{date.toISOString()}</span>,
}));

const minsAgo = (n: number) => new Date(Date.now() - n * 60 * 1000);

describe("mergeFeedEvents", () => {
  it("merges subscriber and contact events", () => {
    const subs = [{ email: "a@test.com", createdAt: minsAgo(1) }];
    const contacts = [{ name: "Bob", company: "Acme", createdAt: minsAgo(2) }];
    const events = mergeFeedEvents(subs, contacts);
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe("subscriber");
    expect(events[1].type).toBe("contact");
  });

  it("sorts events newest first", () => {
    const subs = [{ email: "a@test.com", createdAt: minsAgo(10) }];
    const contacts = [{ name: "Bob", company: null, createdAt: minsAgo(1) }];
    const events = mergeFeedEvents(subs, contacts);
    expect(events[0].type).toBe("contact");
    expect(events[1].type).toBe("subscriber");
  });

  it("limits output to 10 events", () => {
    const subs = Array.from({ length: 8 }, (_, i) => ({ email: `s${i}@test.com`, createdAt: minsAgo(i) }));
    const contacts = Array.from({ length: 6 }, (_, i) => ({
      name: `Bob ${i}`,
      company: null,
      createdAt: minsAgo(i + 8),
    }));
    expect(mergeFeedEvents(subs, contacts)).toHaveLength(10);
  });

  it("returns empty array when both inputs are empty", () => {
    expect(mergeFeedEvents([], [])).toEqual([]);
  });
});

describe("ActivityFeedView", () => {
  it("renders 'No recent activity' when events list is empty", () => {
    render(<ActivityFeedView events={[]} />);
    expect(screen.getByText("No recent activity")).toBeInTheDocument();
  });

  it("renders subscriber event with email", () => {
    const events: FeedEvent[] = [{ type: "subscriber", email: "user@test.com", createdAt: new Date() }];
    render(<ActivityFeedView events={events} />);
    expect(screen.getByText("New subscriber: user@test.com")).toBeInTheDocument();
  });

  it("renders contact event with name and company", () => {
    const events: FeedEvent[] = [
      { type: "contact", name: "Alice Smith", company: "Acme Corp", createdAt: new Date() },
    ];
    render(<ActivityFeedView events={events} />);
    expect(screen.getByText("New contact: Alice Smith (Acme Corp)")).toBeInTheDocument();
  });

  it("renders contact event without company", () => {
    const events: FeedEvent[] = [
      { type: "contact", name: "Alice Smith", company: null, createdAt: new Date() },
    ];
    render(<ActivityFeedView events={events} />);
    expect(screen.getByText("New contact: Alice Smith")).toBeInTheDocument();
  });

  it("renders a relative date for each event", () => {
    const events: FeedEvent[] = [{ type: "subscriber", email: "x@test.com", createdAt: new Date() }];
    render(<ActivityFeedView events={events} />);
    expect(screen.getAllByTestId("relative-date")).toHaveLength(1);
  });
});
