// Custom Auth.js v5 adapter backed by Cloudflare D1 REST API.
// Targets the shared bff-tenants database via getTenantDb().
//
// Column naming follows the bff-tenants schema (snake_case SQL ↔ camelCase JS).

import type {
  Adapter,
  AdapterAccount,
  AdapterSession,
  AdapterUser,
  VerificationToken,
} from "next-auth/adapters";
import { getTenantDb } from "@/lib/d1";

function toIso(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  return d instanceof Date ? d.toISOString() : d;
}

function fromIso(s: string | null | undefined): Date | null {
  if (!s) return null;
  return new Date(s);
}

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  email_verified: string | null;
  image: string | null;
};

type SessionRow = {
  id: string;
  session_token: string;
  user_id: string;
  expires: string;
};

type VerificationTokenRow = {
  identifier: string;
  token: string;
  expires: string;
};

function toUser(row: UserRow): AdapterUser {
  return {
    id: row.id,
    name: row.name ?? null,
    email: row.email ?? "",
    emailVerified: fromIso(row.email_verified),
    image: row.image ?? null,
  };
}

function toSession(row: SessionRow): AdapterSession {
  return {
    sessionToken: row.session_token,
    userId: row.user_id,
    expires: new Date(row.expires),
  };
}

function toVerificationToken(row: VerificationTokenRow): VerificationToken {
  return {
    identifier: row.identifier,
    token: row.token,
    expires: new Date(row.expires),
  };
}

export function D1Adapter(): Adapter {
  return {
    async createUser(user) {
      const db = getTenantDb();
      const id = crypto.randomUUID();
      await db.run("INSERT INTO users (id, name, email, email_verified, image) VALUES (?, ?, ?, ?, ?)", [
        id,
        user.name ?? null,
        user.email,
        toIso(user.emailVerified),
        user.image ?? null,
      ]);
      const rows = await db.query<UserRow>("SELECT * FROM users WHERE id = ? LIMIT 1", [id]);
      return toUser(rows[0]);
    },

    async getUser(id) {
      const db = getTenantDb();
      const rows = await db.query<UserRow>("SELECT * FROM users WHERE id = ? LIMIT 1", [id]);
      return rows[0] ? toUser(rows[0]) : null;
    },

    async getUserByEmail(email) {
      const db = getTenantDb();
      const rows = await db.query<UserRow>("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
      return rows[0] ? toUser(rows[0]) : null;
    },

    async getUserByAccount({ provider, providerAccountId }) {
      const db = getTenantDb();
      const rows = await db.query<UserRow>(
        `SELECT u.* FROM users u
         JOIN accounts a ON a.user_id = u.id
         WHERE a.provider = ? AND a.provider_account_id = ?
         LIMIT 1`,
        [provider, providerAccountId],
      );
      return rows[0] ? toUser(rows[0]) : null;
    },

    async updateUser(user) {
      const db = getTenantDb();
      await db.run("UPDATE users SET name = ?, email = ?, email_verified = ?, image = ? WHERE id = ?", [
        user.name ?? null,
        user.email ?? null,
        toIso(user.emailVerified),
        user.image ?? null,
        user.id,
      ]);
      const rows = await db.query<UserRow>("SELECT * FROM users WHERE id = ? LIMIT 1", [user.id]);
      return toUser(rows[0]);
    },

    async deleteUser(userId) {
      const db = getTenantDb();
      await db.run("DELETE FROM users WHERE id = ?", [userId]);
    },

    async linkAccount(account) {
      const db = getTenantDb();
      const id = crypto.randomUUID();
      await db.run(
        `INSERT INTO accounts
           (id, user_id, type, provider, provider_account_id,
            refresh_token, access_token, expires_at, token_type, scope, id_token, session_state)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          account.userId,
          account.type,
          account.provider,
          account.providerAccountId,
          account.refresh_token ?? null,
          account.access_token ?? null,
          account.expires_at ?? null,
          account.token_type ?? null,
          account.scope ?? null,
          account.id_token ?? null,
          account.session_state ?? null,
        ],
      );
      return account as AdapterAccount;
    },

    async unlinkAccount({ provider, providerAccountId }) {
      const db = getTenantDb();
      await db.run("DELETE FROM accounts WHERE provider = ? AND provider_account_id = ?", [
        provider,
        providerAccountId,
      ]);
    },

    async createSession(session) {
      const db = getTenantDb();
      const id = crypto.randomUUID();
      await db.run("INSERT INTO sessions (id, session_token, user_id, expires) VALUES (?, ?, ?, ?)", [
        id,
        session.sessionToken,
        session.userId,
        toIso(session.expires),
      ]);
      return toSession({
        id,
        session_token: session.sessionToken,
        user_id: session.userId,
        expires: toIso(session.expires)!,
      });
    },

    async getSessionAndUser(sessionToken) {
      const db = getTenantDb();
      const rows = await db.query<SessionRow & UserRow & { s_id: string; u_id: string }>(
        `SELECT
           s.id AS s_id, s.session_token, s.user_id, s.expires,
           u.id AS u_id, u.name, u.email, u.email_verified, u.image
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.session_token = ?
         LIMIT 1`,
        [sessionToken],
      );
      if (!rows[0]) return null;
      const row = rows[0];
      const session: AdapterSession = {
        sessionToken: row.session_token,
        userId: row.user_id,
        expires: new Date(row.expires),
      };
      const user = toUser({
        id: row.user_id,
        name: row.name,
        email: row.email,
        email_verified: row.email_verified,
        image: row.image,
      });
      return { session, user };
    },

    async updateSession(session) {
      const db = getTenantDb();
      await db.run("UPDATE sessions SET expires = ?, user_id = ? WHERE session_token = ?", [
        toIso(session.expires),
        session.userId ?? null,
        session.sessionToken,
      ]);
      const rows = await db.query<SessionRow>("SELECT * FROM sessions WHERE session_token = ? LIMIT 1", [
        session.sessionToken,
      ]);
      return rows[0] ? toSession(rows[0]) : null;
    },

    async deleteSession(sessionToken) {
      const db = getTenantDb();
      await db.run("DELETE FROM sessions WHERE session_token = ?", [sessionToken]);
    },

    async createVerificationToken(token) {
      const db = getTenantDb();
      await db.run("INSERT INTO verification_tokens (identifier, token, expires) VALUES (?, ?, ?)", [
        token.identifier,
        token.token,
        toIso(token.expires),
      ]);
      return toVerificationToken({
        identifier: token.identifier,
        token: token.token,
        expires: toIso(token.expires)!,
      });
    },

    async useVerificationToken({ identifier, token }) {
      const db = getTenantDb();
      const rows = await db.query<VerificationTokenRow>(
        "SELECT * FROM verification_tokens WHERE identifier = ? AND token = ? LIMIT 1",
        [identifier, token],
      );
      if (!rows[0]) return null;
      await db.run("DELETE FROM verification_tokens WHERE identifier = ? AND token = ?", [identifier, token]);
      return toVerificationToken(rows[0]);
    },
  };
}
