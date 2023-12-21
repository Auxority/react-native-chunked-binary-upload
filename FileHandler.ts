import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';
import { Chunk } from './ChunkHelper';

const CHUNK_FILE_EXTENSION = '.stuc';
const NO_FILE_SELECTED_ERROR = 'No file selected';
const DOCUMENT_PICKER_OPTIONS: DocumentPicker.DocumentPickerOptions = {
    type: '*/*',
    copyToCacheDirectory: true,
    multiple: false,
};

const DOCUMENT_WRITE_OPTIONS = { // move to file system utils
    encoding: FileSystem.EncodingType.Base64,
};

const isValidDocumentPickerResult = (result: DocumentPicker.DocumentPickerResult): boolean => {
    return result !== undefined
        && result.canceled !== true
        && result.assets.length > 0;
};

const writeBase64ToCache = async (base64: string, fileUri: string): Promise<string> => {
    await FileSystem.writeAsStringAsync(fileUri, base64, DOCUMENT_WRITE_OPTIONS);
    return fileUri;
};

const payloadToBase64 = (payload: Uint8Array) => {
    const buffer = Buffer.from(payload);
    return buffer.toString(FileSystem.EncodingType.Base64);
};

export const selectFile = async (): Promise<DocumentPicker.DocumentPickerAsset> => {
    const result = await DocumentPicker.getDocumentAsync(DOCUMENT_PICKER_OPTIONS);

    if (!isValidDocumentPickerResult(result)) {
        throw new Error(NO_FILE_SELECTED_ERROR);
    }

    return result?.assets?.[0] as DocumentPicker.DocumentPickerAsset;
};

export const getChunkFileUri = (chunk: Chunk): string => {
    return `${FileSystem.cacheDirectory}/${chunk.hash}.${CHUNK_FILE_EXTENSION}`;
};

export const writePayloadToCache = async (
    payload: Uint8Array,
    fileUri: string,
): Promise<string> => {
    const base64 = payloadToBase64(payload);
    return await writeBase64ToCache(base64, fileUri);
};
