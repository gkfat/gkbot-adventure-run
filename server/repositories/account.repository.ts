/**
 * Account Repository
 * Handles Firestore operations for Account collection
 */

import { BaseRepository } from './base.repository';
import type { Account } from '../../shared/types/account';
import { DatabaseError } from '../../shared/types/errors';

export class AccountRepository extends BaseRepository<Account> {
    protected collectionName = 'accounts';

    /**
     * Get account by Firebase Auth UID
     */
    async getAccountByUid(uid: string): Promise<Account | null> {
        try {
            const snapshot = await this.collection
                .where('accountId', '==', uid)
                .limit(1)
                .get();

            if (snapshot.empty) {
                return null;
            }

            const doc = snapshot.docs[0];
            if (!doc) {
                return null;
            }
            return {
                id: doc.id,
                ...doc.data(),
            } as Account;
        } catch (error: any) {
            throw new DatabaseError(`Failed to get account by UID: ${error.message}`);
        }
    }

    /**
     * Get account by email
     */
    async getAccountByEmail(email: string): Promise<Account | null> {
        try {
            const snapshot = await this.collection
                .where('email', '==', email)
                .limit(1)
                .get();

            if (snapshot.empty) {
                return null;
            }

            const doc = snapshot.docs[0];
            if (!doc) {
                return null;
            }
            return {
                id: doc.id,
                ...doc.data(),
            } as Account;
        } catch (error: any) {
            throw new DatabaseError(`Failed to get account by email: ${error.message}`);
        }
    }

    /**
     * Create new account
     */
    async createAccount(data: {
        accountId: string;
        googleUid: string;
        email: string;
    }): Promise<Account> {
        try {
            const timestamp = Date.now();
            const accountData = {
                accountId: data.accountId,
                provider: 'google' as const,
                googleUid: data.googleUid,
                email: data.email,
                createdAt: timestamp,
                updatedAt: timestamp,
            };

            // Use accountId as document ID for easy lookup
            const docRef = this.collection.doc(data.accountId);
            await docRef.set(accountData);

            return {
                id: data.accountId,
                ...accountData,
            };
        } catch (error: any) {
            throw new DatabaseError(`Failed to create account: ${error.message}`);
        }
    }

    /**
     * Delete account by UID
     */
    async deleteAccount(uid: string): Promise<void> {
        try {
            await this.collection.doc(uid).delete();
        } catch (error: any) {
            throw new DatabaseError(`Failed to delete account: ${error.message}`);
        }
    }
}
