import { render, screen } from "@testing-library/react";
import { StatCards } from "../stat-cards";

describe("StatCards", () => {
  it("renders total, read, and unread counts", () => {
    render(<StatCards total={100} read={60} unread={40} />);
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("60")).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();
  });

  it("renders zero values without crashing", () => {
    render(<StatCards total={0} read={0} unread={0} />);
    expect(screen.getAllByText("0")).toHaveLength(3);
  });

  it("highlights unread card in amber when unread > 0", () => {
    const { container } = render(<StatCards total={5} read={3} unread={2} />);
    expect(container.innerHTML).toContain("amber");
  });

  it("does not apply amber highlight when unread is 0", () => {
    const { container } = render(<StatCards total={5} read={5} unread={0} />);
    expect(container.innerHTML).not.toContain("amber");
  });
});
