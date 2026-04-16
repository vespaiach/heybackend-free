import { render, screen } from "@testing-library/react";
import { DevicesPlatformsCard } from "../devices-platforms-card";

const deviceBreakdown = { mobile: 400, tablet: 100, desktop: 700, unknown: 50 };
const topOS = [
  { os: "macOS", count: 500 },
  { os: "Windows", count: 400 },
  { os: "iOS", count: 200 },
];

describe("DevicesPlatformsCard", () => {
  it("renders device rows", () => {
    render(<DevicesPlatformsCard deviceBreakdown={deviceBreakdown} topOS={topOS} />);
    expect(screen.getByText("Mobile")).toBeInTheDocument();
    expect(screen.getByText("Desktop")).toBeInTheDocument();
    expect(screen.getByText("Tablet")).toBeInTheDocument();
  });

  it("excludes unknown from device percentage total", () => {
    render(<DevicesPlatformsCard deviceBreakdown={deviceBreakdown} topOS={topOS} />);
    // Total known = 400+100+700 = 1200. Mobile = 400/1200 = 33%
    expect(screen.getByText("33%")).toBeInTheDocument();
  });

  it("renders OS platform rows", () => {
    render(<DevicesPlatformsCard deviceBreakdown={deviceBreakdown} topOS={topOS} />);
    expect(screen.getByText("macOS")).toBeInTheDocument();
    expect(screen.getByText("Windows")).toBeInTheDocument();
  });

  it("shows empty state for devices when all zero", () => {
    render(<DevicesPlatformsCard deviceBreakdown={{ mobile: 0, tablet: 0, desktop: 0, unknown: 0 }} topOS={[]} />);
    expect(screen.getByText("No device data yet")).toBeInTheDocument();
  });
});
