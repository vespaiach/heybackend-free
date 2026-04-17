import { render, screen } from "@testing-library/react";
import { StatCards } from "../stat-cards";

describe("StatCards", () => {
  it("renders total, read, and unread counts", () => {
    render(<StatCards total={100} read={60} unread={40} momChange={null} />);
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("60")).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();
  });

  it("renders zero values without crashing", () => {
    render(<StatCards total={0} read={0} unread={0} momChange={null} />);
    expect(screen.getAllByText("0")).toHaveLength(3);
  });

  it("highlights unread card in amber when unread > 0", () => {
    const { container } = render(<StatCards total={5} read={3} unread={2} momChange={null} />);
    expect(container.innerHTML).toContain("amber");
  });

  it("does not apply amber highlight when unread is 0", () => {
    const { container } = render(<StatCards total={5} read={5} unread={0} momChange={null} />);
    expect(container.innerHTML).not.toContain("amber");
  });

  it("renders positive MoM change with + prefix and green color", () => {
    const { container } = render(<StatCards total={10} read={8} unread={2} momChange={15.5} />);
    expect(screen.getByText("+15.5%")).toBeInTheDocument();
    expect(container.innerHTML).toContain("green");
  });

  it("renders negative MoM change with - prefix and destructive color", () => {
    const { container } = render(<StatCards total={10} read={8} unread={2} momChange={-8.3} />);
    expect(screen.getByText("-8.3%")).toBeInTheDocument();
    expect(container.innerHTML).toContain("destructive");
  });

  it("renders null MoM change as — with neutral color", () => {
    render(<StatCards total={10} read={8} unread={2} momChange={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders 0% MoM change with + prefix", () => {
    render(<StatCards total={10} read={8} unread={2} momChange={0} />);
    expect(screen.getByText("+0%")).toBeInTheDocument();
  });
});
