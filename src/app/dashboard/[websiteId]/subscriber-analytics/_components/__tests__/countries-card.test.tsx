import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CountriesCard } from "../countries-card";

const countries = [
  { country: "United States", count: 512 },
  { country: "Brazil", count: 200 },
  { country: "India", count: 150 },
  { country: "Germany", count: 80 },
  { country: "France", count: 60 },
  { country: "Australia", count: 40 },
  { country: "Japan", count: 30 },
];

describe("CountriesCard", () => {
  it("renders only top 5 countries", () => {
    render(<CountriesCard countries={countries} />);
    expect(screen.getByText("United States")).toBeInTheDocument();
    expect(screen.getByText("France")).toBeInTheDocument();
    expect(screen.queryByText("Australia")).not.toBeInTheDocument();
  });

  it("shows subscriber counts", () => {
    render(<CountriesCard countries={countries} />);
    expect(screen.getByText("512")).toBeInTheDocument();
  });

  it("opens View All dialog showing all countries", async () => {
    render(<CountriesCard countries={countries} />);
    await userEvent.click(screen.getByRole("button", { name: /view all/i }));
    expect(screen.getByText("Australia")).toBeInTheDocument();
    expect(screen.getByText("Japan")).toBeInTheDocument();
  });

  it("shows empty state when no country data", () => {
    render(<CountriesCard countries={[]} />);
    expect(screen.getByText("No location data yet")).toBeInTheDocument();
  });
});
