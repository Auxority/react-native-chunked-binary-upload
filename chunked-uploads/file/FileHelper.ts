import { Buffer } from 'buffer';
import { type FileSystemUploadOptions, cacheDirectory, writeAsStringAsync, EncodingType, uploadAsync, deleteAsync, getInfoAsync } from 'expo-file-system';
import { type DocumentPickerResult, type DocumentPickerAsset, getDocumentAsync } from 'expo-document-picker';
import { type Chunk } from '../chunk/ChunkTypes';
import { DOCUMENT_PICKER_OPTIONS, DOCUMENT_WRITE_OPTIONS, CHUNK_FILE_EXTENSION, NO_FILE_SELECTED_ERROR } from './FileConstants';

const getAssetFromPickerResult = (result: DocumentPickerResult | undefined): DocumentPickerAsset => {
  if (result === undefined || result.canceled || result.assets.length === 0) {
    throw NO_FILE_SELECTED_ERROR;
  }

  return result.assets[0];
};

const writeBase64ToCache = async (base64: string, fileUri: string): Promise<string> => {
  const info = await getInfoAsync(fileUri);
  if (info.exists) {
    return fileUri;
  }

  await writeAsStringAsync(fileUri, base64, DOCUMENT_WRITE_OPTIONS);
  return fileUri;
};

const arrayToBase64 = (array: Uint8Array): string => {
  const buffer = Buffer.from(array);
  return buffer.toString(EncodingType.Base64);
};

export const selectFile = async (): Promise<DocumentPickerAsset> => {
  const result = await getDocumentAsync(DOCUMENT_PICKER_OPTIONS);
  return getAssetFromPickerResult(result);
};

export const getChunkFileUri = (chunk: Chunk): string => {
  return `${cacheDirectory}${chunk.hash}.${CHUNK_FILE_EXTENSION}`;
};

export const uploadFile = async (fileUri: string, endpoint: string, options: FileSystemUploadOptions): Promise<void> => {
  await uploadAsync(endpoint, fileUri, options);
};

export const deleteChunkFile = async (chunk: Chunk): Promise<void> => {
  const fileUri = getChunkFileUri(chunk);
  await deleteAsync(fileUri);
};

export const writePayloadToCache = async (
  payload: Uint8Array,
  fileUri: string
): Promise<string> => {
  const base64 = arrayToBase64(payload);
  return await writeBase64ToCache(base64, fileUri);
};
