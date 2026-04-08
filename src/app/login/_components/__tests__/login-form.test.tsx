import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { signIn } from "next-auth/react";
import React from "react";
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

  it("renders Apple and Google login buttons as disabled placeholders", () => {
    render(<LoginForm />);
    const appleBtn = screen.getByRole("button", { name: /login with apple/i });
    const googleBtn = screen.getByRole("button", { name: /login with google/i });
    expect(appleBtn).toBeDisabled();
    expect(googleBtn).toBeDisabled();
  });

  it("does not call signIn when Apple or Google buttons are clicked", async () => {
    render(<LoginForm />);
    await userEvent.click(screen.getByRole("button", { name: /login with apple/i }));
    await userEvent.click(screen.getByRole("button", { name: /login with google/i }));
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("disables the submit button while loading", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let resolve!: (value: any) => void;
    mockSignIn.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );

    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText(/email/i), "test@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send magic link/i }));

    expect(screen.getByRole("button", { name: /sending/i })).toBeDisabled();
    resolve(undefined);
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
