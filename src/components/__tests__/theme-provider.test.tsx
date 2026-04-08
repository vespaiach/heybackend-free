import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useTheme } from "next-themes";
import type React from "react";
import { ThemeProvider } from "@/components/theme-provider";

// Mock next-themes so we test OUR logic, not the library's
vi.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTheme: vi.fn(),
}));

const mockUseTheme = vi.mocked(useTheme);

describe("ThemeProvider", () => {
  beforeEach(() => {
    mockUseTheme.mockReturnValue({
      resolvedTheme: "light",
      setTheme: vi.fn(),
      themes: [],
    } as unknown as ReturnType<typeof useTheme>);
  });

  it("renders children", () => {
    render(
      <ThemeProvider>
        <p>hello</p>
      </ThemeProvider>,
    );
    expect(screen.getByText("hello")).toBeInTheDocument();
  });
});

describe("ThemeHotkey — d key", () => {
  it("toggles to dark when d is pressed in light mode", async () => {
    const setTheme = vi.fn();
    mockUseTheme.mockReturnValue({ resolvedTheme: "light", setTheme, themes: [] } as unknown as ReturnType<
      typeof useTheme
    >);

    render(
      <ThemeProvider>
        <div />
      </ThemeProvider>,
    );

    await userEvent.keyboard("d");

    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  it("toggles to light when d is pressed in dark mode", async () => {
    const setTheme = vi.fn();
    mockUseTheme.mockReturnValue({ resolvedTheme: "dark", setTheme, themes: [] } as unknown as ReturnType<
      typeof useTheme
    >);

    render(
      <ThemeProvider>
        <div />
      </ThemeProvider>,
    );

    await userEvent.keyboard("d");

    expect(setTheme).toHaveBeenCalledWith("light");
  });

  it("does not toggle when d is pressed inside an input", async () => {
    const setTheme = vi.fn();
    mockUseTheme.mockReturnValue({ resolvedTheme: "light", setTheme, themes: [] } as unknown as ReturnType<
      typeof useTheme
    >);

    render(
      <ThemeProvider>
        <input data-testid="field" />
      </ThemeProvider>,
    );

    await userEvent.click(screen.getByTestId("field"));
    await userEvent.keyboard("d");

    expect(setTheme).not.toHaveBeenCalled();
  });

  it("does not toggle when d is pressed inside a textarea", async () => {
    const setTheme = vi.fn();
    mockUseTheme.mockReturnValue({ resolvedTheme: "light", setTheme, themes: [] } as unknown as ReturnType<
      typeof useTheme
    >);

    render(
      <ThemeProvider>
        <textarea data-testid="area" />
      </ThemeProvider>,
    );

    await userEvent.click(screen.getByTestId("area"));
    await userEvent.keyboard("d");

    expect(setTheme).not.toHaveBeenCalled();
  });

  it("does not toggle when Ctrl+D is pressed", async () => {
    const setTheme = vi.fn();
    mockUseTheme.mockReturnValue({ resolvedTheme: "light", setTheme, themes: [] } as unknown as ReturnType<
      typeof useTheme
    >);

    render(
      <ThemeProvider>
        <div />
      </ThemeProvider>,
    );

    await userEvent.keyboard("{Control>}d{/Control}");

    expect(setTheme).not.toHaveBeenCalled();
  });
});
