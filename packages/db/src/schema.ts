import type { ColumnType, Generated } from "kysely";

export type UserRole = "user" | "moderator" | "editor" | "admin";

export interface UsersTable {
  id: Generated<string>;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string>;
}

export interface SessionsTable {
  id: string;
  user_id: string;
  expires_at: ColumnType<Date, Date | string, Date | string>;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface Database {
  users: UsersTable;
  sessions: SessionsTable;
}

export type User = {
  id: string;
  email: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
};
