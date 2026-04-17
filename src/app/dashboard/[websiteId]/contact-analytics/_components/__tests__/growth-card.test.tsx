import { render, screen } from "@testing-library/react";
import { GrowthCard } from "../growth-card";

const trend = Array.from({ length: 12 }, (_, i) => ({
  month: `2025-${String(i + 1).padStart(2, "0")}`,
  count: i * 3,
}));

describe("GrowthCard", () => {
  it("renders positive MoM change with ▲ and green color", () => {
    render(<GrowthCard momChange={15.5} monthlyTrend={trend} />);
    expect(screen.getByText(/15\.5%/)).toBeInTheDocument();
    expect(screen.getByText("▲")).toBeInTheDocument();
  });

  it("renders negative MoM change with ▼ and red color", () => {
    render(<GrowthCard momChange={-8.3} monthlyTrend={trend} />);
    expect(screen.getByText(/8\.3%/)).toBeInTheDocument();
    expect(screen.getByText("▼")).toBeInTheDocument();
  });

  it("renders null MoM change as — with neutral color", () => {
    render(<GrowthCard momChange={null} monthlyTrend={trend} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders without crashing with empty trend data", () => {
    render(<GrowthCard momChange={null} monthlyTrend={[]} />);
    expect(screen.getByText("Month-over-Month")).toBeInTheDocument();
  });
});
