import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WebsiteFormModal } from "@/components/website-form-modal";
import { addWebsite, updateWebsite } from "../actions";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
}));

vi.mock("../actions", () => ({
  addWebsite: vi.fn().mockResolvedValue({}),
  updateWebsite: vi.fn().mockResolvedValue({}),
}));

const mockAddWebsite = vi.mocked(addWebsite);
const mockUpdateWebsite = vi.mocked(updateWebsite);

const testWebsite = {
  id: "site-1",
  name: "My Site",
  url: "https://example.com",
  key: "secret-key-123",
  isActive: true,
  createdAt: new Date("2024-01-01"),
};

describe("WebsiteFormModal", () => {
  beforeEach(() => {
    mockAddWebsite.mockClear();
    mockUpdateWebsite.mockClear();
  });

  describe("add mode", () => {
    it("renders Add Website title", () => {
      render(<WebsiteFormModal open={true} onOpenChange={vi.fn()} />);
      expect(screen.getByRole("heading", { name: /add website/i })).toBeInTheDocument();
    });

    it("renders name and url inputs", () => {
      render(<WebsiteFormModal open={true} onOpenChange={vi.fn()} />);
      expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^url$/i)).toBeInTheDocument();
    });

    it("does not show API key section", () => {
      render(<WebsiteFormModal open={true} onOpenChange={vi.fn()} />);
      expect(screen.queryByText(/api key/i)).not.toBeInTheDocument();
    });

    it("does not show red dot before any input", () => {
      render(<WebsiteFormModal open={true} onOpenChange={vi.fn()} />);
      const submitBtn = screen.getByRole("button", { name: /add website/i });
      expect(submitBtn.querySelector(".bg-red-500")).toBeNull();
    });

    it("shows red dot after typing in the name field", async () => {
      render(<WebsiteFormModal open={true} onOpenChange={vi.fn()} />);
      await userEvent.type(screen.getByLabelText(/^name$/i), "A");
      const submitBtn = screen.getByRole("button", { name: /add website/i });
      expect(submitBtn.querySelector(".bg-red-500")).not.toBeNull();
    });

    it("shows red dot after typing in the url field", async () => {
      render(<WebsiteFormModal open={true} onOpenChange={vi.fn()} />);
      await userEvent.type(screen.getByLabelText(/^url$/i), "h");
      const submitBtn = screen.getByRole("button", { name: /add website/i });
      expect(submitBtn.querySelector(".bg-red-500")).not.toBeNull();
    });

    it("calls addWebsite and closes modal on success", async () => {
      const onOpenChange = vi.fn();
      render(<WebsiteFormModal open={true} onOpenChange={onOpenChange} />);
      await userEvent.type(screen.getByLabelText(/^name$/i), "New Site");
      await userEvent.type(screen.getByLabelText(/^url$/i), "https://newsite.com");
      await userEvent.click(screen.getByRole("button", { name: /add website/i }));

      await waitFor(() => {
        expect(mockAddWebsite).toHaveBeenCalled();
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it("shows error returned by addWebsite", async () => {
      mockAddWebsite.mockResolvedValueOnce({ error: "Failed to add website" });
      render(<WebsiteFormModal open={true} onOpenChange={vi.fn()} />);
      // Required fields must be filled — native validation blocks submit otherwise
      await userEvent.type(screen.getByLabelText(/^name$/i), "My Site");
      await userEvent.type(screen.getByLabelText(/^url$/i), "https://mysite.com");
      await userEvent.click(screen.getByRole("button", { name: /add website/i }));

      await waitFor(() => {
        expect(screen.getByText("Failed to add website")).toBeInTheDocument();
      });
    });

    it("disables submit and shows Saving... while pending", async () => {
      let resolve!: (v: { error?: string }) => void;
      mockAddWebsite.mockReturnValueOnce(
        new Promise((r) => {
          resolve = r;
        }),
      );

      render(<WebsiteFormModal open={true} onOpenChange={vi.fn()} />);
      await userEvent.type(screen.getByLabelText(/^name$/i), "Site");
      await userEvent.type(screen.getByLabelText(/^url$/i), "https://site.com");
      await userEvent.click(screen.getByRole("button", { name: /add website/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
      });
      resolve({});
    });
  });

  describe("edit mode", () => {
    it("renders Edit Website title", () => {
      render(<WebsiteFormModal open={true} onOpenChange={vi.fn()} website={testWebsite} />);
      expect(screen.getByRole("heading", { name: /edit website/i })).toBeInTheDocument();
    });

    it("pre-fills name and url from website prop", () => {
      render(<WebsiteFormModal open={true} onOpenChange={vi.fn()} website={testWebsite} />);
      expect(screen.getByLabelText(/^name$/i)).toHaveValue("My Site");
      expect(screen.getByLabelText(/^url$/i)).toHaveValue("https://example.com");
    });

    it("shows API key section with masked value", () => {
      render(<WebsiteFormModal open={true} onOpenChange={vi.fn()} website={testWebsite} />);
      expect(screen.getByText(/api key/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue("•••••••••••••••••••••••••")).toBeInTheDocument();
    });

    it("refresh button is enabled initially", () => {
      render(<WebsiteFormModal open={true} onOpenChange={vi.fn()} website={testWebsite} />);
      expect(screen.getByTitle(/generate new api key/i)).not.toBeDisabled();
    });

    it("clicking refresh shows 'New key will be generated on save' and disables the button", async () => {
      render(<WebsiteFormModal open={true} onOpenChange={vi.fn()} website={testWebsite} />);
      await userEvent.click(screen.getByTitle(/generate new api key/i));

      expect(screen.getByDisplayValue(/new key will be generated on save/i)).toBeInTheDocument();
      expect(screen.getByTitle(/generate new api key/i)).toBeDisabled();
    });

    it("clicking refresh marks the form dirty (red dot on save button)", async () => {
      render(<WebsiteFormModal open={true} onOpenChange={vi.fn()} website={testWebsite} />);
      await userEvent.click(screen.getByTitle(/generate new api key/i));

      const saveBtn = screen.getByRole("button", { name: /save changes/i });
      expect(saveBtn.querySelector(".bg-red-500")).not.toBeNull();
    });

    it("does not show red dot on save button before any changes", () => {
      render(<WebsiteFormModal open={true} onOpenChange={vi.fn()} website={testWebsite} />);
      const saveBtn = screen.getByRole("button", { name: /save changes/i });
      expect(saveBtn.querySelector(".bg-red-500")).toBeNull();
    });

    it("submits with regenerateKey=1 when refresh was clicked", async () => {
      render(<WebsiteFormModal open={true} onOpenChange={vi.fn()} website={testWebsite} />);
      await userEvent.click(screen.getByTitle(/generate new api key/i));
      await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(mockUpdateWebsite).toHaveBeenCalledWith("site-1", expect.any(FormData));
        const [, formData] = mockUpdateWebsite.mock.calls[0] as [string, FormData];
        expect(formData.get("regenerateKey")).toBe("1");
      });
    });

    it("submits without regenerateKey when refresh was not clicked", async () => {
      render(<WebsiteFormModal open={true} onOpenChange={vi.fn()} website={testWebsite} />);
      await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(mockUpdateWebsite).toHaveBeenCalledWith("site-1", expect.any(FormData));
        const [, formData] = mockUpdateWebsite.mock.calls[0] as [string, FormData];
        expect(formData.get("regenerateKey")).toBeNull();
      });
    });

    it("shows error returned by updateWebsite", async () => {
      mockUpdateWebsite.mockResolvedValueOnce({ error: "Website not found" });
      render(<WebsiteFormModal open={true} onOpenChange={vi.fn()} website={testWebsite} />);
      await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByText("Website not found")).toBeInTheDocument();
      });
    });

    it("closes modal and does not call updateWebsite on Cancel", async () => {
      const onOpenChange = vi.fn();
      render(<WebsiteFormModal open={true} onOpenChange={onOpenChange} website={testWebsite} />);
      await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(mockUpdateWebsite).not.toHaveBeenCalled();
    });
  });

  it("calls onOpenChange(false) when Cancel is clicked in add mode", async () => {
    const onOpenChange = vi.fn();
    render(<WebsiteFormModal open={true} onOpenChange={onOpenChange} />);
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
