import { FileSystemUploadType } from 'expo-file-system';
import { type Chunk } from '../chunk/ChunkTypes';
import { limitConcurrency } from '../concurrency/ConcurrencyHelper';
import { deleteChunkFile, getChunkFileUri, uploadFile, writePayloadToCache } from '../file/FileHelper';
import { UPLOAD_ENDPOINT, UPLOAD_FIELD_NAME, UPLOAD_MIME_TYPE, MAX_CONCURRENT_UPLOADS, MAX_CHUNK_UPLOAD_ATTEMPTS } from './UploadConstants';

const getUploadProgress = (chunksUploaded: number, totalChunks: number): number => {
  return Math.round(100 * chunksUploaded / totalChunks);
};

const showProgress = (chunksUploaded: number, totalChunks: number, onUploadProgress?: (progress: number) => void): void => {
  const progress = getUploadProgress(chunksUploaded, totalChunks);
  if (onUploadProgress !== undefined) {
    onUploadProgress(progress);
  }
  console.log(`Uploading: ${progress}%`);
};

const updateProgress = (
  chunksUploaded: number,
  totalChunks: number,
  onUploadProgress?: (progress: number) => void
): number => {
  showProgress(chunksUploaded + 1, totalChunks, onUploadProgress);
  return chunksUploaded + 1;
};

const writeChunkToFile = async (chunk: Chunk): Promise<string> => {
  const fileUri = getChunkFileUri(chunk);
  return await writePayloadToCache(chunk.payload, fileUri);
};

const uploadChunk = async (chunk: Chunk): Promise<void> => {
  const fileUri = await writeChunkToFile(chunk);
  await uploadFile(fileUri, UPLOAD_ENDPOINT, {
    uploadType: FileSystemUploadType.MULTIPART,
    fieldName: UPLOAD_FIELD_NAME,
    mimeType: UPLOAD_MIME_TYPE,
    parameters: {
      chunk_hash: chunk.hash
    }
  });
  await deleteChunkFile(chunk);
};

const onChunkUploadFailed = async (attempts: number, chunk: Chunk, error: unknown): Promise<void> => {
  if (attempts < MAX_CHUNK_UPLOAD_ATTEMPTS) {
    console.log('Chunk upload failed, retrying');
    await autoRetryUpload(chunk, attempts + 1);
  } else {
    console.log(`Chunk upload ${chunk.hash} failed, no more attempts left. Error: ${String(error)}`);
  }
};

const autoRetryUpload = async (chunk: Chunk, attempts = 1): Promise<void> => {
  try {
    await uploadChunk(chunk);
  } catch (error: unknown) {
    await onChunkUploadFailed(attempts, chunk, error);
  }
};

const prepareChunkUploads = (
  chunks: Chunk[],
  onUploadProgress?: (progress: number) => void
): Array<() => Promise<void>> => {
  let chunksUploaded = 0;
  const totalChunks = chunks.length;
  return chunks.map((chunk: Chunk) => {
    return async () => {
      await autoRetryUpload(chunk);
      chunksUploaded = updateProgress(chunksUploaded, totalChunks, onUploadProgress);
    };
  });
};

export const uploadChunks = async (
  chunks: Chunk[],
  onUploadProgress?: (progress: number) => void
): Promise<void> => {
  const uploadPromises = prepareChunkUploads(chunks, onUploadProgress);
  await limitConcurrency(uploadPromises, MAX_CONCURRENT_UPLOADS);
};
