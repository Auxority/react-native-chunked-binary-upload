import React, { useCallback } from "react";
import { View, Button } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import sha256 from "./sha256";
import { Base64 } from "js-base64";

const Upload = () => {
    const UPLOAD_ENDPOINT = "https://upload.starfiles.co/chunk";
    // const UPLOAD_ENDPOINT = "https://starfilesupload.requestcatcher.com/test"

    const uploadChunks = useCallback(async (chunks) => {
        const promises = chunks.map((chunk, index) => {
            return new Promise((resolve) => {
                const formData = new FormData();
                formData.append("chunk_hash", chunk.hash);

                const base64 = Base64.fromUint8Array(chunk.payload);
                formData.append("upload", base64);

                const promise = fetch(UPLOAD_ENDPOINT, {
                    method: "POST",
                    body: formData,
                });

                resolve(promise);
            });
        });

        try {
            const responses = await Promise.all(promises);
            const data = await Promise.all(responses.map((response) => response.json()));
            console.log(data);
        } catch (err) {
            console.error(`Chunk upload error: ${err}`);
        }
    }, []);

    const getChunkFromBlobSlice = useCallback(async (blobSlice) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onloadend = async () => {
                if (reader.error) {
                    reject(reader.error);
                    return;
                }

                const arrayBuffer = reader.result;
                const payload = new Uint8Array(arrayBuffer);
                const hash = sha256(payload);
                console.log(blobSlice.size, hash)

                resolve({
                    payload,
                    hash,
                });
            }

            reader.onerror = reject;
            reader.readAsArrayBuffer(blobSlice);
        });
    }, []);

    const prepareAndUploadBlob = useCallback(async (blob) => {
        const chunkSize = 2 * 1024 * 1024; // 2MB
        const chunks = [];

        let offset = 0;
        while (offset < blob.size) {
            const blobSlice = blob.slice(offset, offset + chunkSize);
            const chunk = await getChunkFromBlobSlice(blobSlice);
            chunks.push(chunk);

            offset += chunkSize;
        }

        console.log(`Uploading ${chunks.length} chunks!`);

        await uploadChunks(chunks);
    }, []);

    const uploadAsset = useCallback(async (asset) => {
        try {
            const file = await fetch(asset.uri);
            const blob = await file.blob();
            await prepareAndUploadBlob(blob);
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
