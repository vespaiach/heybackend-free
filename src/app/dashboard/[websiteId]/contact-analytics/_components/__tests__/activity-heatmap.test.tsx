import { render, screen } from "@testing-library/react";
import { ActivityHeatmap } from "../activity-heatmap";

describe("ActivityHeatmap", () => {
  it("renders 365 grid cells", () => {
    render(<ActivityHeatmap data={[]} />);
    expect(screen.getAllByRole("gridcell")).toHaveLength(365);
  });

  it("applies green color to days with activity", () => {
    const today = new Date();
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const { container } = render(<ActivityHeatmap data={[{ date, count: 3 }]} />);
    expect(container.innerHTML).toContain("bg-green");
  });

  it("renders muted color for days with no activity", () => {
    const { container } = render(<ActivityHeatmap data={[]} />);
    expect(container.innerHTML).toContain("bg-muted");
  });

  it("shows title 'Submission Activity'", () => {
    render(<ActivityHeatmap data={[]} />);
    expect(screen.getByText("Submission Activity")).toBeInTheDocument();
  });
});
