import { Buffer } from "buffer";
import { View, Button } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import CryptoJS from "crypto-js";
import React, { useCallback } from "react";

import ChunkUtils, { Chunk } from "./ChunkUtils";

class UploadUtils {
    private static readonly UPLOAD_ENDPOINT = "https://upload.starfiles.co/chunk";

    public static async startFileUpload() {
        const document = await UploadUtils.pickDocument();
        await UploadUtils.uploadDocument(document);
    }

    private static async uploadDocument(asset: DocumentPicker.DocumentPickerAsset) {
        try {
            const blob = await UploadUtils.getBlobFromAsset(asset);
            const chunks = await ChunkUtils.createChunks(blob);
            const hashes = chunks.map((chunk) => chunk.hash);
            const fileId = CryptoJS.SHA256(hashes.join("")).toString();
            await UploadUtils.uploadChunks(chunks, fileId);
        } catch (err) {
            throw new Error(`Upload error: ${err}`);
        }
    }

    private static async pickDocument(): Promise<DocumentPicker.DocumentPickerAsset> {
        const result = await DocumentPicker.getDocumentAsync({
            type: "*/*",
            copyToCacheDirectory: true,
            multiple: false,
        });

        if (result === undefined || result.canceled === true || result.assets.length === 0) {
            throw new Error("No file selected");
        }

        return result.assets[0];
    }

    private static async getBlobFromAsset(asset: DocumentPicker.DocumentPickerAsset) {
        const file = await fetch(asset.uri);
        return await file.blob();
    }

    private static arrayToBase64(array: Uint8Array) {
        const buffer = Buffer.from(array);
        return buffer.toString("base64");
    }

    private static async executeUpload(url: string, fileUri: string) {
        return await FileSystem.uploadAsync(
            url,
            fileUri,
            {
                httpMethod: "POST",
                uploadType: FileSystem.FileSystemUploadType.MULTIPART,
                fieldName: "upload",
            },
        );
    }

    private static async uploadChunk(chunk: Chunk, fileId: string, index: number) {
        const fileUri = `${FileSystem.cacheDirectory}/${fileId}-chunk-${index}`;
        const urlParameters = new URLSearchParams({
            test: "true",
            chunk_hash: chunk.hash,
            chunk_index: String(index),
            file_id: fileId,
        });
        const url = `${UploadUtils.UPLOAD_ENDPOINT}?${urlParameters.toString()}`;

        try {
            await FileSystem.writeAsStringAsync(
                fileUri,
                UploadUtils.arrayToBase64(chunk.payload),
                { encoding: FileSystem.EncodingType.Base64 }
            );
            const response = await UploadUtils.executeUpload(url, fileUri);
            console.log(`Response body: ${response.body}`);
        } catch (err) {
            throw new Error(`Error while uploading a chunk: ${err}`);
        }

        await FileSystem.deleteAsync(fileUri);
    }

    private static async uploadChunks(chunks: Chunk[], fileId: string) {
        let chunksUploaded = 0;
        const promises = chunks.map(async (chunk, index) => {
            await UploadUtils.uploadChunk(chunk, fileId, index);
            chunksUploaded++;
            // TODO: Show progress to the user?
            console.log(`Upload progress: ${(chunksUploaded / chunks.length * 100).toFixed(1)}% (${chunksUploaded}/${chunks.length})`);
        });
        try {
            return await Promise.all(promises);
        } catch (err) {
            throw new Error(`Error while uploading chunks: ${err}`);
        }
    }
}

const Upload = () => {
    const startFileUpload = useCallback(async () => {
        try {
            await UploadUtils.startFileUpload()
        } catch (err) {
            // TODO: Show an error message to the user?
            console.error(`An error occurred while uploading a file: ${err}`);
        }
    }, []);

    return (
        <View>
            <Button title="Upload File" onPress={startFileUpload} />
        </View>
    );
};

export default Upload;
