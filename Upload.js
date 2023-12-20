import React, { useCallback } from "react";
import { View, Button } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import CryptoJS from "crypto-js";

import { Buffer } from "buffer";

const Upload = () => {
    const UPLOAD_ENDPOINT = "https://upload.starfiles.co/chunk";
    // const UPLOAD_ENDPOINT = "https://starfilesupload.requestcatcher.com/test";
    const CHUNK_SIZE = 2 * 1024 * 1024; // in MB

    const uint8ArrayToBase64 = (uint8Array) => {
        const buffer = Buffer.from(uint8Array);
        return buffer.toString("base64");
    };

    // THIS SHOULD STAY IN THE UPLOAD.JS FILE:
    const uploadChunk = async (chunk, fileId, index) => {
        const fileUri = `${FileSystem.cacheDirectory}/${fileId}-chunk-${index}`;

        await FileSystem.writeAsStringAsync(
            fileUri,
            uint8ArrayToBase64(chunk.payload),
            { encoding: FileSystem.EncodingType.Base64 }
        );

        try {
            const urlParameters = new URLSearchParams({
                // test: "true",
                chunk_hash: chunk.hash,
                chunk_index: String(index),
                file_id: fileId,
            });
            const url = `${UPLOAD_ENDPOINT}?${urlParameters.toString()}`;

            const response = await FileSystem.uploadAsync(
                url,
                fileUri,
                {
                    httpMethod: "POST",
                    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
                    fieldName: "upload",
                },
            );

            console.log(`Response body: ${response.body}`);
        } catch (err) {
            console.error(`Error while uploading chunk: ${err}`);
        }

        await FileSystem.deleteAsync(fileUri);
    }

    const uploadChunks = useCallback(async (chunks, fileId) => {
        const promises = chunks.map((chunk, index) => uploadChunk(chunk, fileId, index));
        return await Promise.all(promises);
    }, []);
    // THIS SHOULD STAY IN THE UPLOAD.JS FILE ^^^

    // MOVE THIS TO A CHUNK UTILS FILE:
    const createChunk = useCallback(async (readerResult) => {
        const payload = new Uint8Array(readerResult);
        const wordArray = CryptoJS.lib.WordArray.create(payload);
        const hash = CryptoJS.SHA256(wordArray).toString();
        const chunk = {
            payload,
            hash,
        };

        console.log(`${hash} <- ${payload.length} bytes`);

        return chunk;
    }, []);

    const readBlobSliceAsArrayBuffer = useCallback((blobSlice) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(createChunk(reader.result));
            reader.onerror = (err) => reject(`Error reading blob slice: ${err}`);
            reader.readAsArrayBuffer(blobSlice);
        });
    }, []);

    const createChunks = useCallback(async (blob) => {
        const chunks = [];

        for (let offset = 0; offset < blob.size; offset += CHUNK_SIZE) {
            try {
                const blobSlice = blob.slice(offset, offset + CHUNK_SIZE);
                const chunk = await readBlobSliceAsArrayBuffer(blobSlice);
                chunks.push(chunk);
            } catch (err) {
                console.error(`Error while creating chunks: ${err}`);
                break;
            }
        }

        return chunks;
    }, []);
    // MOVE THIS TO A CHUNK UTILS FILE ^^^

    const uploadAsset = useCallback(async (asset) => {
        try {
            const file = await fetch(asset.uri);
            const blob = await file.blob();
            const chunks = await createChunks(blob);
            const hashes = chunks.map((chunk) => chunk.hash);
            const fileId = CryptoJS.SHA256(hashes.join("")).toString();
            await uploadChunks(chunks, fileId);
        } catch (err) {
            console.error(`Upload error: ${err}`);
        }
    }, []);

    const startFileUpload = useCallback(async () => {
        const result = await DocumentPicker.getDocumentAsync({
            type: "*/*",
            copyToCacheDirectory: true,
            multiple: false,
        });

        if (result.canceled === true || result.assets.length === 0) {
            return;
        }

        const asset = result.assets[0];
        await uploadAsset(asset);
    }, []);

    return (
        <View>
            <Button title="Upload File" onPress={startFileUpload} />
        </View>
    );
};

export default Upload;
