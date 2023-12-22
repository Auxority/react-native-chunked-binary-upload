import { FileSystemUploadType } from 'expo-file-system';
import { Chunk } from '../chunk/ChunkTypes';
import { limitConcurrency } from '../concurrency/ConcurrencyHelper';
import { deleteChunkFile, getChunkFileUri, uploadFile, writePayloadToCache } from '../file/FileHelper';
import { UPLOAD_ENDPOINT, UPLOAD_FIELD_NAME, UPLOAD_MIME_TYPE, MAX_CONCURRENT_UPLOADS } from './UploadConstants';

const getUploadProgress = (chunksUploaded: number, totalChunks: number): number => {
    return Math.round(100 * chunksUploaded / totalChunks);
};

const showProgress = (chunksUploaded: number, totalChunks: number): void => {
    const progress = getUploadProgress(chunksUploaded, totalChunks);
    console.log(`Uploading: ${progress}%`);
    // callback(`${t('uploading')} (${progress}%)`);
};

const updateProgress = (chunksUploaded: number, totalChunks: number): number => {
    showProgress(chunksUploaded + 1, totalChunks);
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
            chunk_hash: chunk.hash,
        },
    });
    await deleteChunkFile(chunk);
};

const prepareChunkUploads = (chunks: Chunk[]): (() => Promise<void>)[] => {
    let chunksUploaded = 0;
    const totalChunks = chunks.length;
    return chunks.map((chunk: Chunk) => {
        return async () => {
            await uploadChunk(chunk);
            chunksUploaded = updateProgress(chunksUploaded, totalChunks);
        };
    });
};

export const uploadChunks = async (chunks: Chunk[]): Promise<void> => {
    const uploadPromises = prepareChunkUploads(chunks);
    await limitConcurrency<void>(uploadPromises, MAX_CONCURRENT_UPLOADS);
};
