import { render, screen } from "@testing-library/react";
import { SubscriberAgeCard } from "../subscriber-age-card";

const age = { seedlings: 200, sprouts: 150, saplings: 100, evergreens: 300 };

describe("SubscriberAgeCard", () => {
  it("renders all 4 cohort labels", () => {
    render(<SubscriberAgeCard subscriberAge={age} totalActive={750} />);
    expect(screen.getByText("Seedlings")).toBeInTheDocument();
    expect(screen.getByText("Sprouts")).toBeInTheDocument();
    expect(screen.getByText("Saplings")).toBeInTheDocument();
    expect(screen.getByText("Evergreens")).toBeInTheDocument();
  });

  it("renders cohort counts", () => {
    render(<SubscriberAgeCard subscriberAge={age} totalActive={750} />);
    expect(screen.getByText("200")).toBeInTheDocument();
    expect(screen.getByText("300")).toBeInTheDocument();
  });

  it("calculates percentages relative to totalActive", () => {
    render(<SubscriberAgeCard subscriberAge={age} totalActive={750} />);
    // 300/750 = 40%
    expect(screen.getByText("40%")).toBeInTheDocument();
  });

  it("shows 0% bars when totalActive is 0", () => {
    render(
      <SubscriberAgeCard
        subscriberAge={{ seedlings: 0, sprouts: 0, saplings: 0, evergreens: 0 }}
        totalActive={0}
      />,
    );
    const pcts = screen.getAllByText("0%");
    expect(pcts.length).toBe(4);
  });
});
