import * as FileSystem from 'expo-file-system';
import { Chunk } from './ChunkHelper';
import { getChunkFileUri, writePayloadToCache } from './FileHandler';
import { limitConcurrency } from './ConcurrencyHelper';
import { UPLOAD_ENDPOINT, UPLOAD_HTTP_METHOD } from './UploadConstants';

const MAX_CONCURRENT_UPLOADS = 5;
const UPLOAD_FIELD_NAME = 'upload';
const UPLOAD_OPTIONS: FileSystem.FileSystemUploadOptions = {
    httpMethod: UPLOAD_HTTP_METHOD,
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: UPLOAD_FIELD_NAME,
};

const getUploadProgress = (chunksUploaded: number, totalChunks: number): number => {
    return Math.round(100 * chunksUploaded / totalChunks);
};

const showProgress = (chunksUploaded: number, totalChunks: number): void => {
    const progress = getUploadProgress(chunksUploaded, totalChunks);
    console.log(`Uploading: ${progress}%`);
    // callback(`${t('uploading')} (${progress}%)`);
};

// TODO: Implement this function to show upload progress
const updateProgress = (chunksUploaded: number, totalChunks: number): number => {
    showProgress(chunksUploaded + 1, totalChunks);
    return chunksUploaded + 1;
};

const getUrlParameters = (chunk: Chunk, chunkIndex: number): URLSearchParams => {
    return new URLSearchParams({
        test: 'true', // TODO: Don't forget to remove this
        chunk_hash: chunk.hash,
        chunk_index: String(chunkIndex),
    });
};

const getUploadUrl = (chunk: Chunk, chunkIndex: number): string => {
    const urlParameters = getUrlParameters(chunk, chunkIndex);
    return `${UPLOAD_ENDPOINT}?${urlParameters.toString()}`;
};

const writeChunkToFile = async (chunk: Chunk): Promise<string> => {
    const fileUri = getChunkFileUri(chunk);
    return await writePayloadToCache(chunk.payload, fileUri);
};

const sendChunk = async (chunk: Chunk, url: string): Promise<void> => {
    const fileUri = await writeChunkToFile(chunk);
    await FileSystem.uploadAsync(url, fileUri, UPLOAD_OPTIONS);
};

const deleteCachedChunk = async (chunk: Chunk): Promise<void> => {
    const fileUri = getChunkFileUri(chunk);
    await FileSystem.deleteAsync(fileUri);
};

const storeSendAndDeleteChunk = async (chunk: Chunk, url: string): Promise<void> => {
    await sendChunk(chunk, url);
    await deleteCachedChunk(chunk);
};

const uploadChunk = async (chunk: Chunk, chunkIndex: number): Promise<void> => {
    const url = getUploadUrl(chunk, chunkIndex);
    return await storeSendAndDeleteChunk(chunk, url);
};

const prepareChunkUploads = (chunks: Chunk[]): (() => Promise<void>)[] => {
    console.log(1);
    let chunksUploaded = 0;
    return chunks.map((chunk: Chunk, chunkIndex: number) => {
        return async () => {
            console.log(2);
            const result = await uploadChunk(chunk, chunkIndex);
            chunksUploaded = updateProgress(chunksUploaded, chunks.length);
            return result;
        };
    });
};

export const uploadChunks = async (chunks: Chunk[]): Promise<void> => {
    const uploadPromises = prepareChunkUploads(chunks);
    await limitConcurrency<void>(uploadPromises, MAX_CONCURRENT_UPLOADS);
};
