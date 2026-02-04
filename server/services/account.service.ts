import { BaseService } from './base.service';
import { AccountRepository } from '../repositories/account.repository';
import { CharacterRepository } from '../repositories/character.repository';
import { getAuth } from 'firebase-admin/auth';
import { getFirebaseAdminApp } from '../utils/firebaseAdmin';
import type { Account } from '../../shared/types/account';
import type { Character } from '../../shared/types/character';
import {
    NotFoundError, AuthError, DatabaseError, 
} from '../../shared/types/errors';

/**
 * Result type for createOrGetAccount
 */
type CreateOrGetAccountResult = {
    account: Account;
    character: Character;
    isNewAccount: boolean;
};

export class AccountService extends BaseService {
    protected serviceName = 'account';
    private accountRepo: AccountRepository;
    private characterRepo: CharacterRepository;

    constructor() {
        super();
        this.accountRepo = new AccountRepository();
        this.characterRepo = new CharacterRepository();
    }

    /**
     * Create or get existing account + character
     * Used during login flow
     */
    async createOrGetAccount(uid: string): Promise<CreateOrGetAccountResult> {
        try {
            // Check if account already exists
            const existingAccount = await this.accountRepo.getAccountByUid(uid);
            if (existingAccount) {
                this.logInfo('Account found', {
                    action: 'createOrGetAccount',
                    userId: uid,
                });

                // Check if character exists (handle inconsistent state)
                let existingCharacter = await this.characterRepo.getByAccountId(uid);
                
                if (!existingCharacter) {
                    // Inconsistent state: account exists but character missing
                    this.logWarn('Account exists but character missing, creating character', {
                        action: 'createOrGetAccount',
                        userId: uid,
                    });
                    
                    existingCharacter = await this.characterRepo.createCharacter({ accountId: uid });
                }

                return {
                    account: existingAccount,
                    character: existingCharacter,
                    isNewAccount: false,
                };
            }

            // Get user info from Firebase Auth
            const auth = getAuth(getFirebaseAdminApp());
            let firebaseUser;
            try {
                firebaseUser = await auth.getUser(uid);
            } catch (error: unknown) {
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

            // Create both Account and Character atomically using batch
            const {
                batch, getDocRef: getAccountDocRef, 
            } = this.accountRepo.createBatchWrite();
            const { getDocRef: getCharacterDocRef } = this.characterRepo.createBatchWrite();
            const timestamp = Date.now();
            
            // Prepare account data
            const accountData = {
                accountId: uid,
                provider: 'google' as const,
                googleUid: firebaseUser.uid,
                email: firebaseUser.email,
                createdAt: timestamp,
                updatedAt: timestamp,
            };
            
            // Prepare character data using centralized initialization logic
            const characterData = this.characterRepo.prepareInitialCharacterData(uid);
            
            // Batch write for atomicity
            const accountRef = getAccountDocRef(uid);
            const characterRef = getCharacterDocRef(uid);
            
            batch.set(accountRef, accountData);
            batch.set(characterRef, characterData);
            
            await batch.commit();

            this.logInfo('Account and character created', {
                action: 'createOrGetAccount',
                userId: uid,
                data: { email: firebaseUser.email },
            });

            return {
                account: {
                    id: uid,
                    ...accountData,
                },
                character: characterData,
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
     */
    async deleteAccountCascade(uid: string): Promise<void> {
        // Ensure CharacterRepository is initialized
        if (!this.characterRepo) {
            this.characterRepo = new CharacterRepository();
        }

        try {
            // Verify account exists
            const account = await this.getAccount(uid);

            this.logInfo('Starting account deletion', {
                action: 'deleteAccountCascade',
                userId: uid,
                data: { email: account.email },
            });

            // Delete character (1:1 relationship)
            try {
                await this.characterRepo.delete(uid);
                this.logInfo('Character deleted', {
                    action: 'deleteAccountCascade',
                    userId: uid,
                });
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                this.logWarn('Failed to delete character (may not exist)', {
                    action: 'deleteAccountCascade',
                    userId: uid,
                    data: { error: message },
                });
                // Continue even if character deletion fails
            }

            // Delete account from Firestore
            await this.accountRepo.deleteAccount(uid);

            // Delete user from Firebase Auth
            const auth = getAuth(getFirebaseAdminApp());
            try {
                await auth.deleteUser(uid);
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                this.logWarn('Failed to delete Firebase Auth user (may already be deleted)', {
                    action: 'deleteAccountCascade',
                    userId: uid,
                    data: { error: message },
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
