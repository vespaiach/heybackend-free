import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TrendChart } from "../trend-chart";

const daily = Array.from({ length: 35 }, (_, i) => {
  const d = new Date(2025, 0, i + 1);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { date, count: i + 1 };
});

const monthly = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2024, i, 1);
  const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return { month, count: (i + 1) * 5 };
});

describe("TrendChart", () => {
  it("renders the card title", () => {
    render(<TrendChart dailyActivity={daily} monthlyTrend={monthly} />);
    expect(screen.getByText("Contact Trend")).toBeInTheDocument();
  });

  it("renders all three range buttons", () => {
    render(<TrendChart dailyActivity={daily} monthlyTrend={monthly} />);
    expect(screen.getByRole("button", { name: "30 Days" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "6 Months" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
  });

  it("defaults to 6 Months selection", () => {
    render(<TrendChart dailyActivity={daily} monthlyTrend={monthly} />);
    const btn = screen.getByRole("button", { name: "6 Months" });
    expect(btn.className).toContain("bg-primary");
  });

  it("switches to 30 Days when clicked", async () => {
    render(<TrendChart dailyActivity={daily} monthlyTrend={monthly} />);
    await userEvent.click(screen.getByRole("button", { name: "30 Days" }));
    expect(screen.getByRole("button", { name: "30 Days" }).className).toContain("bg-primary");
  });

  it("switches to All when clicked", async () => {
    render(<TrendChart dailyActivity={daily} monthlyTrend={monthly} />);
    await userEvent.click(screen.getByRole("button", { name: "All" }));
    expect(screen.getByRole("button", { name: "All" }).className).toContain("bg-primary");
  });

  it("renders without crashing with empty data", () => {
    render(<TrendChart dailyActivity={[]} monthlyTrend={[]} />);
    expect(screen.getByText("Contact Trend")).toBeInTheDocument();
  });
});
