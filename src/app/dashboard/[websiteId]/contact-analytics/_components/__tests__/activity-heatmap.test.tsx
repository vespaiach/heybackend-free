import { render, screen } from "@testing-library/react";
import { ActivityHeatmap } from "../activity-heatmap";

const today = new Date();
function isoDate(daysAgo: number): string {
  const d = new Date(today);
  d.setDate(today.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

describe("ActivityHeatmap", () => {
  it("renders without crashing with empty data", () => {
    render(<ActivityHeatmap dailyActivity={[]} />);
    expect(screen.getByText("Submission Activity")).toBeInTheDocument();
  });

  it("renders with realistic daily activity data", () => {
    const data = [
      { date: isoDate(10), count: 5 },
      { date: isoDate(30), count: 1 },
      { date: isoDate(200), count: 8 },
    ];
    render(<ActivityHeatmap dailyActivity={data} />);
    expect(screen.getByText("Submission Activity")).toBeInTheDocument();
  });

  it("renders 371 day cells (53 weeks × 7 days)", () => {
    const { container } = render(<ActivityHeatmap dailyActivity={[]} />);
    const cells = container.querySelectorAll("[data-date]");
    expect(cells.length).toBe(371);
  });

  it("applies higher intensity class for a date with many contacts", () => {
    const busyDate = isoDate(5);
    const { container } = render(<ActivityHeatmap dailyActivity={[{ date: busyDate, count: 10 }]} />);
    const cell = container.querySelector(`[data-date="${busyDate}"]`);
    expect(cell?.className).toContain("bg-primary");
  });
});
