import { Buffer } from 'buffer';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

import ChunkUtils, { Chunk } from './ChunkUtils';
import CompileUtils from './CompileUtils';

export default class UploadUtils {
    private static readonly UPLOAD_ENDPOINT = 'https://upload.starfiles.co/chunk';
    private static readonly CHUNK_FILE_EXTENSION = '.stuc';
    private static readonly MAX_CONCURRENT_UPLOADS = 5;
    private static readonly UPLOAD_OPTIONS: FileSystem.FileSystemUploadOptions = {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'upload',
    };
    private static readonly DOCUMENT_PICKER_OPTIONS: DocumentPicker.DocumentPickerOptions = {
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
    };
    private static readonly DOCUMENT_WRITE_OPTIONS: FileSystem.WritingOptions = {
        encoding: FileSystem.EncodingType.Base64,
    };

    public static async startFileUpload(fileName: string, makePublic: boolean = false) {
        const document = await this.pickDocument();
        await this.uploadDocument(document, fileName, makePublic);
    }

    private static async uploadDocument(asset: DocumentPicker.DocumentPickerAsset, fileName: string, makePublic: boolean) {
        try {
            const blob = await this.getBlobFromAsset(asset);
            const chunks = await ChunkUtils.createChunks(blob);
            const hashes = chunks.map((chunk) => chunk.hash);
            const fileId = Math.random().toString(36).substring(2, 18);
            // const response = await CompileUtils.compileFile(hashes, fileId, fileName, makePublic);
            // if (response.status === true) {
            //     return response.file;
            // }

            await this.uploadChunks(chunks);

            const response = await CompileUtils.compileFile(hashes, fileId, fileName, makePublic);
            console.log(response);
            if (response.status === true) {
                return response.file;
            }
        } catch (err) {
            throw new Error(`Upload error: ${err}`);
        }
    }

    private static async pickDocument(): Promise<DocumentPicker.DocumentPickerAsset> {
        const result = await DocumentPicker.getDocumentAsync(this.DOCUMENT_PICKER_OPTIONS);

        if (result === undefined || result.canceled === true || result.assets.length === 0) {
            throw new Error('No file selected');
        }

        return result.assets[0];
    }

    private static async getBlobFromAsset(asset: DocumentPicker.DocumentPickerAsset) {
        const file = await fetch(asset.uri);
        return await file.blob();
    }

    private static arrayToBase64(array: Uint8Array) {
        const buffer = Buffer.from(array);
        return buffer.toString(FileSystem.EncodingType.Base64);
    }

    private static getFileUri(chunk: Chunk) {
        return `${FileSystem.cacheDirectory}/${chunk.hash}.${this.CHUNK_FILE_EXTENSION}`;
    }

    private static getUrlParameters(chunk: Chunk, chunkIndex: number) {
        return new URLSearchParams({
            // test: 'true',
            chunk_hash: chunk.hash,
            chunk_index: String(chunkIndex),
        });
    }

    private static getUploadUrl(chunk: Chunk, chunkIndex: number) {
        const urlParameters = this.getUrlParameters(chunk, chunkIndex);
        return `${this.UPLOAD_ENDPOINT}?${urlParameters.toString()}`;
    }

    private static async uploadChunk(chunk: Chunk, chunkIndex: number): Promise<FileSystem.FileSystemUploadResult> {
        const fileUri = this.getFileUri(chunk);
        const url = this.getUploadUrl(chunk, chunkIndex);

        try {
            const base64 = this.arrayToBase64(chunk.payload)
            await FileSystem.writeAsStringAsync(fileUri, base64, this.DOCUMENT_WRITE_OPTIONS);
            const response = await FileSystem.uploadAsync(url, fileUri, this.UPLOAD_OPTIONS);
            console.log(`Response body: ${response.body}`);
            await FileSystem.deleteAsync(fileUri);
            return response;
        } catch (err) {
            await FileSystem.deleteAsync(fileUri);
            throw new Error(`Error while uploading a chunk: ${err}`);
        }
    }

    private static async uploadChunks(chunks: Chunk[]): Promise<FileSystem.FileSystemUploadResult[]> {
        let chunksUploaded = 0;
        const promises = chunks.map((chunk, chunkIndex) => async () => {
            const result = await this.uploadChunk(chunk, chunkIndex);
            chunksUploaded++;
            this.logProgress(chunksUploaded, chunks);
            return result;
        });

        try {
            return await this.limitConcurrency(promises, this.MAX_CONCURRENT_UPLOADS);
        } catch (err) {
            throw new Error(`Error while uploading chunks: ${err}`);
        }
    }

    private static logProgress(chunksUploaded: number, chunks: Chunk[]) {
        console.log(`Uploading: ${this.getUploadProgress(chunksUploaded, chunks)}%`);
    }

    private static getUploadProgress(chunksUploaded: number, chunks: Chunk[]) {
        return Math.round(100 * chunksUploaded / chunks.length);
    }

    private static limitConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
        return new Promise((resolve, reject) => {
            let activeTasks = 0;
            let finishedTasks = 0;
            const results: T[] = [];
            const processQueue = () => {
                if (tasks.length === 0 && activeTasks === 0) {
                    resolve(results);
                    return;
                }
                while (activeTasks < limit && tasks.length > 0) {
                    activeTasks++;
                    const taskIndex = finishedTasks + activeTasks - 1;
                    const task = tasks.shift()!;
                    task()
                        .then(result => {
                            activeTasks--;
                            finishedTasks++;
                            results[taskIndex] = result;
                            processQueue();
                        })
                        .catch(reject);
                }
            };
            processQueue();
        });
    }
}