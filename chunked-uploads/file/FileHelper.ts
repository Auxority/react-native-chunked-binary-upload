import { Buffer } from 'buffer';
import { FileSystemUploadOptions, cacheDirectory } from 'expo-file-system';
import { DocumentPickerResult, DocumentPickerAsset, getDocumentAsync } from 'expo-document-picker';
import { writeAsStringAsync, EncodingType, uploadAsync, deleteAsync } from 'expo-file-system';
import { Chunk } from '../chunk/ChunkTypes';
import { DOCUMENT_PICKER_OPTIONS, DOCUMENT_WRITE_OPTIONS, CHUNK_FILE_EXTENSION, NO_FILE_SELECTED_ERROR } from './FileConstants';

const isValidDocumentPickerResult = (result: DocumentPickerResult): boolean => {
    return result !== undefined
        && result.canceled !== true
        && result.assets.length > 0;
};

const writeBase64ToCache = async (base64: string, fileUri: string): Promise<string> => {
    await writeAsStringAsync(fileUri, base64, DOCUMENT_WRITE_OPTIONS);
    return fileUri;
};

const arrayToBase64 = (array: Uint8Array) => {
    const buffer = Buffer.from(array);
    return buffer.toString(EncodingType.Base64);
};

export const selectFile = async (): Promise<DocumentPickerAsset> => {
    const result = await getDocumentAsync(DOCUMENT_PICKER_OPTIONS);

    if (!isValidDocumentPickerResult(result)) {
        throw NO_FILE_SELECTED_ERROR;
    }

    return result?.assets?.[0] as DocumentPickerAsset;
};

export const getChunkFileUri = (chunk: Chunk): string => {
    return `${cacheDirectory}${chunk.hash}.${CHUNK_FILE_EXTENSION}`;
};

export const uploadFile = async (fileUri: string, endpoint: string, options: FileSystemUploadOptions): Promise<void> => {
    await uploadAsync(endpoint, fileUri, options);
};

export const deleteChunkFile = async (chunk: Chunk): Promise<void> => {
    const fileUri = getChunkFileUri(chunk);
    return await deleteAsync(fileUri);
};

export const writePayloadToCache = async (
    payload: Uint8Array,
    fileUri: string,
): Promise<string> => {
    const base64 = arrayToBase64(payload);
    return await writeBase64ToCache(base64, fileUri);
};
