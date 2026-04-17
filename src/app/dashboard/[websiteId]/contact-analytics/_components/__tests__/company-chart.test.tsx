import { render, screen } from "@testing-library/react";
import { CompanyChart } from "../company-chart";

const breakdown = [
  { company: "Acme Corp", count: 50 },
  { company: "Beta Inc", count: 30 },
  { company: "Unknown", count: 10 },
  { company: "Others", count: 5 },
];

describe("CompanyChart", () => {
  it("renders the card title", () => {
    render(<CompanyChart companyBreakdown={breakdown} />);
    expect(screen.getByText("Company Concentration")).toBeInTheDocument();
  });

  it("renders all company names in the legend", () => {
    render(<CompanyChart companyBreakdown={breakdown} />);
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("Beta Inc")).toBeInTheDocument();
    expect(screen.getByText("Unknown")).toBeInTheDocument();
    expect(screen.getByText("Others")).toBeInTheDocument();
  });

  it("renders an empty state when breakdown is empty", () => {
    render(<CompanyChart companyBreakdown={[]} />);
    expect(screen.getByText("No company data")).toBeInTheDocument();
  });

  it("renders without crashing with a single company", () => {
    render(<CompanyChart companyBreakdown={[{ company: "Solo Corp", count: 100 }]} />);
    expect(screen.getByText("Solo Corp")).toBeInTheDocument();
  });
});
