/**
 * Mailbox related types
 */

import type { Timestamp } from './common';

export type MailStatus = 'unclaimed' | 'claimed';

/**
 * A single mail message addressed to a character (see design.md:
 * rewards are character-level resources, so the recipient is characterId).
 */
export type MailMessage = {
  mailId: string;
  characterId: string;
  title: string;
  body: string;
  rewardGold: number;
  rewardGems: number;
  rewardItemIds: string[];
  status: MailStatus;
  createdAt: Timestamp;
  claimedAt?: Timestamp;
};
