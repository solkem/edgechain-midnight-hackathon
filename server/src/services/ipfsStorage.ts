/**
 * IPFS Storage Service using Storacha (formerly Web3.Storage)
 *
 * Provides decentralized storage for IoT sensor readings.
 * - FREE unlimited storage
 * - Content-addressed (CID-based)
 * - Censorship-resistant
 *
 * Usage:
 * 1. Upload reading → get CID
 * 2. Store CID in database
 * 3. Retrieve reading from IPFS by CID
 */

import * as Client from '@storacha/client';
import * as Signer from '@ucanto/principal/ed25519';

export interface IPFSReading {
  reading_json: string;
  signature: string;
  device_pubkey: string;
  timestamp: number;
  metadata?: any;
}

export class IPFSStorageService {
  private client: any;
  private initialized: boolean = false;

  constructor() {
    // Client will be initialized on first use
  }

  /**
   * Initialize the Storacha client
   * This requires an email for authorization (free tier)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Create a new client with in-memory store
      const principal = await Signer.generate();

      this.client = await Client.create({ principal });

      // Note: For production, you'll need to:
      // 1. Sign up at https://console.storacha.network
      // 2. Create a space
      // 3. Get delegation credentials
      // For now, we'll use a simpler approach with environment variable

      console.log('✅ IPFS Storage Service initialized (Storacha)');
      this.initialized = true;
    } catch (error: any) {
      console.error('❌ Failed to initialize IPFS Storage Service:', error.message);
      throw error;
    }
  }

  /**
   * Upload sensor reading to IPFS
   * Returns the Content ID (CID) for later retrieval
   */
  async uploadReading(reading: IPFSReading): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Convert reading to blob
      const data = JSON.stringify(reading);
      const blob = new Blob([data], { type: 'application/json' });
      const file = new File([blob], `reading-${reading.timestamp}.json`);

      // Upload to IPFS via Storacha
      const cid = await this.client.uploadFile(file);

      console.log(`📤 Uploaded reading to IPFS: ${cid}`);
      return cid.toString();
    } catch (error: any) {
      console.error('❌ Failed to upload reading to IPFS:', error.message);
      throw error;
    }
  }

  /**
   * Upload multiple readings as a batch
   * More efficient than individual uploads
   */
  async uploadBatch(readings: IPFSReading[]): Promise<string[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const cids: string[] = [];

      // Create files for each reading
      const files = readings.map((reading, index) => {
        const data = JSON.stringify(reading);
        const blob = new Blob([data], { type: 'application/json' });
        return new File([blob], `reading-${index}-${reading.timestamp}.json`);
      });

      // Upload directory of readings
      const dirCid = await this.client.uploadDirectory(files);

      console.log(`📤 Uploaded ${readings.length} readings to IPFS: ${dirCid}`);

      // For simplicity, return the directory CID for all readings
      // In production, you might want individual CIDs
      return readings.map(() => dirCid.toString());
    } catch (error: any) {
      console.error('❌ Failed to upload batch to IPFS:', error.message);
      throw error;
    }
  }

  /**
   * Retrieve reading from IPFS by CID
   * Anyone can call this - it's public data!
   */
  async getReading(cid: string): Promise<IPFSReading | null> {
    try {
      // Fetch from IPFS gateway
      const response = await fetch(`https://${cid}.ipfs.w3s.link/`);

      if (!response.ok) {
        console.error(`Failed to fetch CID ${cid}: ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      return data as IPFSReading;
    } catch (error: any) {
      console.error(`❌ Failed to retrieve reading from IPFS (${cid}):`, error.message);
      return null;
    }
  }

  /**
   * Get IPFS gateway URL for a CID
   * Useful for frontend to display links
   */
  getGatewayUrl(cid: string): string {
    return `https://${cid}.ipfs.w3s.link/`;
  }
}

// Export singleton instance
export const ipfsStorage = new IPFSStorageService();
