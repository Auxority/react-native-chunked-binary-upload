import React, { useCallback } from "react";
import { View, Button } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import CryptoJS from "crypto-js";

const Upload = () => {
    // const UPLOAD_ENDPOINT = "https://upload.starfiles.co/chunk";
    const UPLOAD_ENDPOINT = "https://starfilesupload.requestcatcher.com/test";
    const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB

    // THIS SHOULD STAY IN THE UPLOAD.JS FILE:
    const uploadChunk = async (chunk, fileId, index) => {
        const formData = new FormData();

        const blob = new Blob([chunk.payload], { type: 'application/octet-stream' });
        console.log(`Blob: ${blob.size} bytes. Payload: ${chunk.payload.length} bytes`);
        formData.append("upload", blob);

        const headers = {
            "X-Chunk-Index": index,
            "X-Chunk-Hash": chunk.hash,
            "X-File-Id": fileId,
        };

        console.log(`Starting chunk upload!`);

        try {
            const res = await fetch(UPLOAD_ENDPOINT, {
                method: "POST",
                body: formData,
                headers: headers,
            });
            console.log(res.status, res.statusText);
        } catch (err) {
            console.error(`Error while uploading chunk: ${err}`);
        }
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
            reader.onloadend = () => resolve(createChunk(reader.result));
            reader.onerror = (err) => reject(`Error reading blob slice: ${err}`);
            reader.readAsArrayBuffer(blobSlice);
        });
    }, []);

    const processBlobSlice  = useCallback((blob, offset) => {
        const blobSlice = blob.slice(offset, offset + CHUNK_SIZE);
        return readBlobSliceAsArrayBuffer(blobSlice);
    }, []);

    const createChunks = useCallback(async (blob) => {
        const chunks = [];

        for (let offset = 0; offset < blob.size; offset += CHUNK_SIZE) {
            try {
                const chunk = await processBlobSlice(blob, offset);
                chunks.push(chunk);
            } catch (err) {
                console.error(`Error while uploading chunks: ${err}`);
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
