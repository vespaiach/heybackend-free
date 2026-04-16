import { render, screen } from "@testing-library/react";
import { StatCards } from "../stat-cards";

const base = {
  totalActive: 1240,
  newThisPeriod: 84,
  unsubscribedThisPeriod: 12,
  growthRate: 6.7,
};

describe("StatCards", () => {
  it("renders all four stat values", () => {
    render(<StatCards {...base} />);
    expect(screen.getByText("1,240")).toBeInTheDocument();
    expect(screen.getByText("84")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("+6.7%")).toBeInTheDocument();
  });

  it("shows em-dash when growthRate is null", () => {
    render(<StatCards {...base} growthRate={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows negative growth rate with minus sign", () => {
    render(<StatCards {...base} growthRate={-3.2} />);
    expect(screen.getByText("-3.2%")).toBeInTheDocument();
  });
});
