/**
 * Account Repository
 * Handles Firestore operations for Account collection
 */

import type { DocumentData } from 'firebase-admin/firestore';
import { BaseRepository } from './base.repository';
import type { Account } from '../../shared/types/account';
import {
    DatabaseError, NotFoundError,
} from '../../shared/types/errors';

export class AccountRepository extends BaseRepository<Account> {
    protected collectionName = 'accounts';

    /**
     * Fill in default audio settings for accounts created before these fields existed.
     */
    private withAudioSettingsDefaults(data: DocumentData): DocumentData {
        return {
            ...data,
            bgmEnabled: data.bgmEnabled ?? true,
            sfxEnabled: data.sfxEnabled ?? true,
        };
    }

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
                ...this.withAudioSettingsDefaults(doc.data()),
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
                ...this.withAudioSettingsDefaults(doc.data()),
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
                bgmEnabled: true,
                sfxEnabled: true,
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
     * Update audio settings (BGM/SFX) for an account. Only patched fields are written.
     */
    async updateAudioSettings(
        accountId: string,
        patch: { bgmEnabled?: boolean; sfxEnabled?: boolean },
    ): Promise<Account> {
        try {
            const docRef = this.collection.doc(accountId);
            await docRef.update({
                ...patch,
                updatedAt: Date.now(),
            });

            const doc = await docRef.get();
            if (!doc.exists) {
                throw new NotFoundError('account');
            }
            return {
                id: doc.id,
                ...this.withAudioSettingsDefaults(doc.data()!),
            } as Account;
        } catch (error: any) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            throw new DatabaseError(`Failed to update audio settings: ${error.message}`);
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
