import { BaseService } from './base.service';
import { AccountRepository } from '../repositories/account.repository';
import { getAuth } from 'firebase-admin/auth';
import { getFirebaseAdminApp } from '../utils/firebaseAdmin';
import type { Account } from '../../shared/types/account';
import {
    NotFoundError, AuthError, DatabaseError, 
} from '../../shared/types/errors';

export class AccountService extends BaseService {
    protected serviceName = 'account';
    private accountRepo: AccountRepository;

    constructor() {
        super();
        this.accountRepo = new AccountRepository();
    }

    /**
     * Create or get existing account
     * Used during login flow
     */
    async createOrGetAccount(uid: string): Promise<{
        account: Account;
        isNewAccount: boolean;
    }> {
        try {
            // Check if account already exists
            const existingAccount = await this.accountRepo.getAccountByUid(uid);
            if (existingAccount) {
                this.logInfo('Account found', {
                    action: 'createOrGetAccount',
                    userId: uid,
                });
                return {
                    account: existingAccount,
                    isNewAccount: false,
                };
            }

            // Get user info from Firebase Auth
            const auth = getAuth(getFirebaseAdminApp());
            let firebaseUser;
            try {
                firebaseUser = await auth.getUser(uid);
            } catch (error: any) {
                this.logError('Failed to get Firebase user', {
                    action: 'createOrGetAccount',
                    userId: uid,
                    error,
                });
                throw new AuthError('Invalid user credentials');
            }

            // Validate user has email
            if (!firebaseUser.email) {
                throw new AuthError('User email not found');
            }

            // Create new account
            const account = await this.accountRepo.createAccount({
                accountId: uid,
                googleUid: firebaseUser.uid,
                email: firebaseUser.email,
            });

            this.logInfo('Account created', {
                action: 'createOrGetAccount',
                userId: uid,
                data: { email: firebaseUser.email },
            });

            return {
                account,
                isNewAccount: true,
            };
        } catch (error) {
            if (error instanceof AuthError || error instanceof DatabaseError) {
                throw error;
            }
            this.logError('Unexpected error in createOrGetAccount', {
                action: 'createOrGetAccount',
                userId: uid,
                error,
            });
            throw new DatabaseError('Failed to create or get account');
        }
    }

    /**
     * Get account by UID
     */
    async getAccount(uid: string): Promise<Account> {
        try {
            const account = await this.accountRepo.getAccountByUid(uid);
            if (!account) {
                throw new NotFoundError('account');
            }
            return account;
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            this.logError('Failed to get account', {
                action: 'getAccount',
                userId: uid,
                error,
            });
            throw new DatabaseError('Failed to get account');
        }
    }

    /**
     * Delete account and all associated data (cascade)
     * This should be extended to delete related data (characters, runs, etc.)
     */
    async deleteAccountCascade(uid: string): Promise<void> {
        try {
            // Verify account exists
            const account = await this.getAccount(uid);

            this.logInfo('Starting account deletion', {
                action: 'deleteAccountCascade',
                userId: uid,
                data: { email: account.email },
            });

            // TODO: Delete related data (characters, runs, etc.) when those systems are implemented
            // For now, just delete the account document

            // Delete account from Firestore
            await this.accountRepo.deleteAccount(uid);

            // Delete user from Firebase Auth
            const auth = getAuth(getFirebaseAdminApp());
            try {
                await auth.deleteUser(uid);
            } catch (error: any) {
                this.logWarn('Failed to delete Firebase Auth user (may already be deleted)', {
                    action: 'deleteAccountCascade',
                    userId: uid,
                    data: { error: error.message },
                });
                // Continue even if Firebase Auth deletion fails
            }

            this.logInfo('Account deleted successfully', {
                action: 'deleteAccountCascade',
                userId: uid,
            });
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            this.logError('Failed to delete account', {
                action: 'deleteAccountCascade',
                userId: uid,
                error,
            });
            throw new DatabaseError('Failed to delete account');
        }
    }
}
