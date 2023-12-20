import CryptoJS from "crypto-js";

export type Chunk = {
    hash: string;
    payload: Uint8Array;
};

export default class ChunkUtils {
    private static readonly CHUNK_SIZE = 2 * 1024 * 1024; // in MB

    public static async createChunks(blob: Blob): Promise<Chunk[]> {
        const chunks: Chunk[] = [];

        for (let offset = 0; offset < blob.size; offset += ChunkUtils.CHUNK_SIZE) {
            try {
                const blobSlice = blob.slice(offset, offset + ChunkUtils.CHUNK_SIZE);
                const chunk = await ChunkUtils.readBlobSliceAsArrayBuffer(blobSlice);
                chunks.push(chunk);
                // TODO: Show progress to user?
                console.log(`Hashing progress: ${Math.floor(100 * (offset / blob.size))}% (${offset} / ${blob.size})`);
            } catch (err) {
                throw new Error(`Error while creating chunks: ${err}`);
            }
        }
    
        return chunks;
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

    private static readBlobSliceAsArrayBuffer(blobSlice: Blob): Promise<Chunk> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(ChunkUtils.createChunk(reader.result as ArrayBuffer));
            reader.onerror = (err) => reject(`Error reading blob slice: ${err}`);
            reader.readAsArrayBuffer(blobSlice);
        });
    }
}
