import CryptoJS from 'crypto-js';
import { EXPECTED_ARRAY_BUFFER_ERROR, MAX_CHUNK_SIZE, MAX_CONCURRENT_CHUNKS as MAX_SIMULTANEOUS_CHUNKS_PROCESSED } from './ChunkConstants';
import { type Chunk } from './ChunkTypes';
import { limitConcurrency } from '../concurrency/ConcurrencyHelper';

const getHashingProgress = (offset: number, blobSize: number): number => {
  return Math.max(0, Math.min(100, Math.round(100 * (offset + MAX_CHUNK_SIZE) / blobSize)));
};

const showHashingProgress = (
  offset: number,
  blobSize: number,
  onHashingProgress?: (progress: number) => void
): void => {
  const progress = getHashingProgress(offset, blobSize);
  if (onHashingProgress !== undefined) {
    onHashingProgress(progress);
  }
  console.log(`Hashing: ${progress}%`);
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
  if (readerResult === null || typeof readerResult === 'string') {
    throw EXPECTED_ARRAY_BUFFER_ERROR;
  }

  return {
    hash: getHashFromArrayBuffer(readerResult),
    payload: getPayloadFromArrayBuffer(readerResult)
  };
};

const createChunkFromBlobSlice = async (
  blobSlice: Blob
): Promise<Chunk> => {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => { resolve(createChunkFromReaderResult(reader.result)); };
    reader.onerror = reject;
    reader.readAsArrayBuffer(blobSlice);
  });
};

const createChunkFromBlob = async (
  blob: Blob,
  offset: number
): Promise<Chunk> => {
  const blobSlice = blob.slice(offset, offset + MAX_CHUNK_SIZE);
  return await createChunkFromBlobSlice(blobSlice);
};

const createChunksFromBlob = async (
  blob: Blob,
  onHashingProgress?: (progress: number) => void
): Promise<Chunk[]> => {
  const offsets = Array.from({ length: Math.ceil(blob.size / MAX_CHUNK_SIZE) }, (_, i) => i * MAX_CHUNK_SIZE);
  const promises = offsets.map((offset) => {
    return async (): Promise<Chunk> => {
      const chunk = await createChunkFromBlob(blob, offset);
      showHashingProgress(offset, blob.size, onHashingProgress);
      return chunk;
    };
  });
  const chunks: Chunk[] = await limitConcurrency<Chunk>(promises, MAX_SIMULTANEOUS_CHUNKS_PROCESSED);

  return chunks;
};

export const createChunksFromUri = async (
  uri: string,
  onHashingProgress?: (progress: number) => void
): Promise<Chunk[]> => {
  const blob = await fetchBlobFromUri(uri);
  return await createChunksFromBlob(blob, onHashingProgress);
};
