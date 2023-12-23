import type * as DocumentPicker from 'expo-document-picker';
import { EncodingType } from 'expo-file-system';

export const CHUNK_FILE_EXTENSION = 'stuc';
export const NO_FILE_SELECTED_ERROR = new Error('No file selected');
export const DOCUMENT_PICKER_OPTIONS: DocumentPicker.DocumentPickerOptions = {
  type: '*/*',
  copyToCacheDirectory: true,
  multiple: false
};
export const DOCUMENT_WRITE_OPTIONS = {
  encoding: EncodingType.Base64
};
