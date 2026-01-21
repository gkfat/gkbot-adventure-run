/**
 * Base repository with common Firestore operations
 */

import type {
    Firestore, DocumentData, QuerySnapshot, 
} from 'firebase-admin/firestore';
import { getAdminFirestore } from '../utils/firebaseAdmin';
import {
    DatabaseError, NotFoundError, 
} from '../../shared/types/errors';

export abstract class BaseRepository<T extends DocumentData> {
    protected db: Firestore;
  protected abstract collectionName: string;

  constructor() {
      this.db = getAdminFirestore();
  }

  /**
   * Get collection reference
   */
  protected get collection() {
      return this.db.collection(this.collectionName);
  }

  /**
   * Get document by ID
   */
  async getById(id: string): Promise<T | null> {
      try {
          const doc = await this.collection.doc(id).get();
          if (!doc.exists) {
              return null;
          }
          return {
              id: doc.id, ...doc.data(), 
          } as unknown as T;
      } catch (error: any) {
          throw new DatabaseError(`Failed to get document: ${error.message}`);
      }
  }

  /**
   * Get document by ID or throw error
   */
  async getByIdOrThrow(id: string, resourceName?: string): Promise<T> {
      const doc = await this.getById(id);
      if (!doc) {
          throw new NotFoundError(resourceName || this.collectionName);
      }
      return doc;
  }

  /**
   * Create new document
   */
  async create(id: string, data: Partial<T>): Promise<T> {
      try {
          const timestamp = Date.now();
          const docData = {
              ...data,
              createdAt: timestamp,
              updatedAt: timestamp,
          } as DocumentData;

          await this.collection.doc(id).set(docData);
          return {
              id, ...docData, 
          } as unknown as T;
      } catch (error: any) {
          throw new DatabaseError(`Failed to create document: ${error.message}`);
      }
  }

  /**
   * Update document
   */
  async update(id: string, data: Partial<T>): Promise<T> {
      try {
          const updateData = {
              ...data,
              updatedAt: Date.now(),
          } as DocumentData;

          await this.collection.doc(id).update(updateData);
          return this.getByIdOrThrow(id);
      } catch (error: any) {
          throw new DatabaseError(`Failed to update document: ${error.message}`);
      }
  }

  /**
   * Delete document
   */
  async delete(id: string): Promise<void> {
      try {
          await this.collection.doc(id).delete();
      } catch (error: any) {
          throw new DatabaseError(`Failed to delete document: ${error.message}`);
      }
  }

  /**
   * Check if document exists
   */
  async exists(id: string): Promise<boolean> {
      try {
          const doc = await this.collection.doc(id).get();
          return doc.exists;
      } catch (error: any) {
          throw new DatabaseError(`Failed to check document existence: ${error.message}`);
      }
  }

  /**
   * Convert QuerySnapshot to array of documents
   */
  protected snapshotToArray(snapshot: QuerySnapshot<DocumentData>): T[] {
      return snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
      })) as unknown as T[];
  }

  /**
   * Batch write helper
   */
  protected createBatch() {
      return this.db.batch();
  }
}
