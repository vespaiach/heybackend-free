import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Nodemailer, { type NodemailerConfig } from "next-auth/providers/nodemailer";
import { createTransport } from "nodemailer";
import { prisma } from "@/lib/prisma";

export async function sendVerificationRequest({
  identifier: email,
  url,
}: {
  identifier: string;
  url: string;
  expires: Date;
  provider: NodemailerConfig;
  token: string;
  theme: Parameters<NodemailerConfig["sendVerificationRequest"]>[0]["theme"];
  request: Request;
}): Promise<void> {
  const transport = createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: Number(process.env.EMAIL_SERVER_PORT ?? 587),
    secure: process.env.EMAIL_SERVER_SECURE === "true",
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  });

  await transport.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Sign in to HeyBackend",
    text: `Click the link below to sign in.\n\n${url}\n\nThis link expires in 24 hours and can only be used once.`,
    html: `
      <p>Click the button below to sign in to HeyBackend.</p>
      <p><a href="${url}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;border-radius:6px">Sign in</a></p>
      <p>Or copy this link into your browser:</p>
      <p style="word-break:break-all;color:#666">${url}</p>
      <p style="color:#999;font-size:12px">This link expires in 24 hours and can only be used once. If you did not request this email, you can safely ignore it.</p>
    `.trim(),
  });
}

const emailProvider =
  process.env.ENV === "development"
    ? Nodemailer({
        from: "noreply@localhost",
        server: "smtp://localhost:25?ignoreTLS=true",
        sendVerificationRequest({ url, identifier: email }) {
          console.log(
            `\n┌─ Magic Link ─────────────────────────────\n│  To:  ${email}\n│  URL: ${url}\n└──────────────────────────────────────────\n`,
          );
        },
      })
    : Nodemailer({
        from: process.env.EMAIL_FROM,
        server: {
          host: process.env.EMAIL_SERVER_HOST,
          port: Number(process.env.EMAIL_SERVER_PORT ?? 465),
          secure: process.env.EMAIL_SERVER_SECURE === "true",
          auth: {
            user: process.env.EMAIL_SERVER_USER,
            pass: process.env.EMAIL_SERVER_PASSWORD,
          },
        },
        sendVerificationRequest,
      });

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  providers: [
    emailProvider,
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  pages: {
    signIn: "/login",
  },
});
