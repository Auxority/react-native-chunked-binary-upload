import CryptoJS from 'crypto-js';

export type Chunk = {
    hash: string;
    payload: Uint8Array;
};

export default class ChunkUtils {
    private static readonly CHUNK_SIZE = 2 * 1024 * 1024; // in MB

    public static async createChunks(blob: Blob): Promise<Chunk[]> {
        const chunks: Chunk[] = [];

        for (let offset = 0; offset < blob.size; offset += this.CHUNK_SIZE) {
            await this.processBlobSlice(blob, offset, chunks);
        }
    
        return chunks;
    }

    private static async processBlobSlice(blob: Blob, offset: number, chunks: Chunk[]) {
        const blobSlice = blob.slice(offset, offset + this.CHUNK_SIZE);
        try {
            const chunk = await this.hashBlobSlice(blobSlice);
            chunks.push(chunk);
            console.log(`Hashing: ${this.getHashingProgress(offset, blob.size)}%`);
        } catch (err) {
            throw new Error(`Error while creating chunks: ${err}`);
        }
    }

    private static getHashingProgress(offset: number, blobSize: number): number {
        return Math.round(100 * ((offset + this.CHUNK_SIZE) / blobSize));
    }

    private static async createChunk(readerResult: ArrayBuffer) {
        const payload = new Uint8Array(readerResult);
        const wordArray = CryptoJS.lib.WordArray.create(payload as unknown as number[]);
        const hash = CryptoJS.SHA256(wordArray).toString();
        const chunk: Chunk = {
            payload,
            hash,
        };

        return chunk;
    }

    private static hashBlobSlice(blobSlice: Blob): Promise<Chunk> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(this.createChunk(reader.result as ArrayBuffer));
            reader.onerror = (err) => reject(`Error reading blob slice: ${err}`);
            reader.readAsArrayBuffer(blobSlice);
        });
    }
}
