import type { NextRequest } from 'next/server';
import { db } from './db';

export interface Context {
  db: typeof db;
  userId: string | null;
  req: NextRequest;
}

export function createContext({ req }: { req: NextRequest }): Context {
  // For MVP: extract userId from a simple header or session cookie.
  // In production, replace with full auth (NextAuth, Clerk, etc.)
  const userId = req.headers.get('x-user-id') ?? null;

  return { db, userId, req };
}
