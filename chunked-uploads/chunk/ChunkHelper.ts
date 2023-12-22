import CryptoJS from 'crypto-js';
import { EXPECTED_ARRAY_BUFFER_ERROR, MAX_CHUNK_SIZE } from './ChunkConstants';
import { Chunk } from './ChunkTypes';

const getHashingProgress = (offset: number, blobSize: number): number => {
    return Math.max(0, Math.min(100, Math.round(100 * (offset + MAX_CHUNK_SIZE) / blobSize)));
};

const showHashingProgress = (offset: number, blobSize: number): void => {
    console.log(`Hashing: ${getHashingProgress(offset, blobSize)}%`);
    // TODO: Show the progress to the user
};

const fetchBlobFromUri = async (uri: string): Promise<Blob> => {
    const file = await fetch(uri);
    return await file.blob();
};

const getPayloadFromArrayBuffer = (resultBuffer: ArrayBuffer): Uint8Array => {
    return new Uint8Array(resultBuffer);
};

const getWordArrayFromArrayBuffer = (resultBuffer: ArrayBuffer): CryptoJS.lib.WordArray => {
    const payload = getPayloadFromArrayBuffer(resultBuffer);
    return CryptoJS.lib.WordArray.create(payload as unknown as number[]);
};

const getHashFromArrayBuffer = (resultBuffer: ArrayBuffer): string => {
    const wordArray = getWordArrayFromArrayBuffer(resultBuffer);
    return CryptoJS.SHA256(wordArray).toString();
};

const createChunkFromReaderResult = (readerResult: FileReader['result']): Chunk => {
    if (!readerResult || typeof readerResult === 'string') {
        throw EXPECTED_ARRAY_BUFFER_ERROR;
    }

    return {
        hash: getHashFromArrayBuffer(readerResult),
        payload: getPayloadFromArrayBuffer(readerResult),
    };
};

const createChunkFromBlobSlice = async (
    blobSlice: Blob,
): Promise<Chunk> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(createChunkFromReaderResult(reader.result));
        reader.onerror = reject;
        reader.readAsArrayBuffer(blobSlice);
    });
};

const createChunkFromBlob = async (
    blob: Blob,
    offset: number,
): Promise<Chunk> => {
    const blobSlice = blob.slice(offset, offset + MAX_CHUNK_SIZE);
    return await createChunkFromBlobSlice(blobSlice);
};

const createChunksFromBlob = async (blob: Blob): Promise<Chunk[]> => {
    const chunks: Chunk[] = [];

    for (let offset = 0; offset < blob.size; offset += MAX_CHUNK_SIZE) {
        const chunk = await createChunkFromBlob(blob, offset);
        chunks.push(chunk);
        showHashingProgress(offset, blob.size);
    }

    return chunks;
};

export const createChunksFromUri = async (uri: string): Promise<Chunk[]> => {
    const blob = await fetchBlobFromUri(uri);
    return await createChunksFromBlob(blob);
};
