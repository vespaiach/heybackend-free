import { render, screen } from "@testing-library/react";
import type { GrowthDataPoint } from "@/lib/domain/types";
import { GrowthChart } from "../growth-chart";

// Recharts uses ResizeObserver internally
global.ResizeObserver = vi.fn(function ResizeObserverMock(this) {
  this.observe = vi.fn();
  this.unobserve = vi.fn();
  this.disconnect = vi.fn();
});

const data: GrowthDataPoint[] = [
  { date: "2026-04-01", newSubscribers: 10, unsubscribes: 2 },
  { date: "2026-04-02", newSubscribers: 15, unsubscribes: 1 },
];

describe("GrowthChart", () => {
  it("renders without crashing with data", () => {
    const { container } = render(<GrowthChart data={data} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("renders empty state when data is empty", () => {
    render(<GrowthChart data={[]} />);
    expect(screen.getByText("No data for this period")).toBeInTheDocument();
  });
});
