import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type SignInResponse, signIn } from "next-auth/react";
import { LoginForm } from "@/app/login/_components/login-form";

vi.mock("next-auth/react", () => ({
  signIn: vi.fn().mockResolvedValue({}),
}));

const mockSignIn = vi.mocked(signIn);

describe("LoginForm", () => {
  beforeEach(() => {
    mockSignIn.mockClear();
  });

  it("renders email input and send magic link button", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send magic link/i })).toBeInTheDocument();
  });

  it("does not render a password input", () => {
    render(<LoginForm />);
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
  });

  it("renders Google button as enabled", () => {
    render(<LoginForm />);
    expect(screen.getByRole("button", { name: /login with google/i })).not.toBeDisabled();
  });

  it("calls signIn with google provider when Google button is clicked", async () => {
    render(<LoginForm />);
    await userEvent.click(screen.getByRole("button", { name: /login with google/i }));
    expect(mockSignIn).toHaveBeenCalledWith("google", { callbackUrl: "/dashboard/home" });
  });

  it("renders GitHub button as enabled", () => {
    render(<LoginForm />);
    expect(screen.getByRole("button", { name: /login with github/i })).not.toBeDisabled();
  });

  it("calls signIn with github provider when GitHub button is clicked", async () => {
    render(<LoginForm />);
    await userEvent.click(screen.getByRole("button", { name: /login with github/i }));
    expect(mockSignIn).toHaveBeenCalledWith("github", { callbackUrl: "/dashboard/home" });
  });

  it("disables the submit button while loading", async () => {
    let resolve!: (value: SignInResponse) => void;
    mockSignIn.mockReturnValueOnce(
      new Promise<SignInResponse>((r) => {
        resolve = r;
      }),
    );

    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText(/email/i), "test@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send magic link/i }));

    expect(screen.getByRole("button", { name: /sending/i })).toBeDisabled();
    resolve({ error: undefined, code: undefined, status: 200, ok: true, url: null });
  });

  it("shows check-your-email confirmation after successful submission", async () => {
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText(/email/i), "test@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send magic link/i }));

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/test@example.com/)).toBeInTheDocument();
    expect(mockSignIn).toHaveBeenCalledWith("nodemailer", {
      email: "test@example.com",
      callbackUrl: "/dashboard/home",
      redirect: false,
    });
  });
});
