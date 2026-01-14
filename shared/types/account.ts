/**
 * Account and authentication related types
 */

import type { Timestamp } from './common';

/**
 * Account document stored in Firestore
 */
export type Account = {
  accountId: string;      // Firebase Auth UID
  provider: 'google';     // Auth provider
  googleUid: string;      // Google user ID
  email: string;          // User email
  createdAt: Timestamp;   // Account creation timestamp
  updatedAt: Timestamp;   // Last update timestamp
};

/**
 * Account creation input
 */
export type CreateAccountInput = {
  accountId: string;
  googleUid: string;
  email: string;
};

/**
 * Auth token payload (from Firebase Auth)
 */
export type AuthTokenPayload = {
  uid: string;
  email?: string;
  email_verified?: boolean;
};
