import { render, screen } from "@testing-library/react";
import { StatCards } from "../StatCards";

describe("StatCards", () => {
  it("renders all three stat cards", () => {
    render(<StatCards total={100} read={60} unread={40} />);
    expect(screen.getByText("Total Contacts")).toBeInTheDocument();
    expect(screen.getByText("Read")).toBeInTheDocument();
    expect(screen.getByText("Unread")).toBeInTheDocument();
  });

  it("displays the correct values", () => {
    render(<StatCards total={100} read={60} unread={40} />);
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("60")).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();
  });

  it("renders zero values without error", () => {
    render(<StatCards total={0} read={0} unread={0} />);
    expect(screen.getAllByText("0")).toHaveLength(3);
  });
});
