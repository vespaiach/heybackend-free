import { render, screen } from "@testing-library/react";
import type { GrowthDataPoint } from "@/lib/domain/types";
import { GrowthSectionView } from "../growth-section";

// Recharts uses ResizeObserver internally
global.ResizeObserver = vi.fn(function ResizeObserverMock(this: ResizeObserver) {
  (this as unknown as { observe: () => void }).observe = vi.fn();
  (this as unknown as { unobserve: () => void }).unobserve = vi.fn();
  (this as unknown as { disconnect: () => void }).disconnect = vi.fn();
});

describe("GrowthSectionView", () => {
  it("renders 'Last 30 days' as the range label", () => {
    render(<GrowthSectionView data={[]} />);
    expect(screen.getByText("Last 30 days")).toBeInTheDocument();
  });

  it("renders without crashing when data is provided", () => {
    const data: GrowthDataPoint[] = [{ date: "2026-04-01", newSubscribers: 10, unsubscribes: 2 }];
    const { container } = render(<GrowthSectionView data={data} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("shows empty state message when data is empty", () => {
    render(<GrowthSectionView data={[]} />);
    expect(screen.getByText("No data for this period")).toBeInTheDocument();
  });
});
