import { render, screen } from "@testing-library/react";
import { KpiCardsView } from "../kpi-cards";

const base = {
  totalActive: 1240,
  newThisPeriod: 84,
  growthRate: 6.7,
  totalContacts: 45,
  unreadContacts: 3,
};

describe("KpiCardsView", () => {
  it("renders all four KPI values", () => {
    render(<KpiCardsView {...base} />);
    expect(screen.getByText("1,240")).toBeInTheDocument();
    expect(screen.getByText("84")).toBeInTheDocument();
    expect(screen.getByText("45")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows positive growth rate in green", () => {
    const { container } = render(<KpiCardsView {...base} growthRate={6.7} />);
    expect(screen.getByText("+6.7% last 30 days")).toBeInTheDocument();
    expect(container.innerHTML).toContain("green");
  });

  it("shows negative growth rate with destructive color", () => {
    const { container } = render(<KpiCardsView {...base} growthRate={-3.2} />);
    expect(screen.getByText("-3.2% last 30 days")).toBeInTheDocument();
    expect(container.innerHTML).toContain("destructive");
  });

  it("hides growth badge and shows fallback label when growthRate is null", () => {
    render(<KpiCardsView {...base} growthRate={null} />);
    expect(screen.queryByText(/% last 30 days/)).not.toBeInTheDocument();
    expect(screen.getByText("active subscribers")).toBeInTheDocument();
  });

  it("highlights unread contacts in amber when unread > 0", () => {
    const { container } = render(<KpiCardsView {...base} unreadContacts={3} />);
    expect(container.innerHTML).toContain("amber");
  });

  it("does not highlight unread contacts when count is 0", () => {
    const { container } = render(<KpiCardsView {...base} unreadContacts={0} />);
    expect(container.innerHTML).not.toContain("amber");
  });
});
