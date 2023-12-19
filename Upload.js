import React, { useCallback } from "react";
import { View, Button } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import sha256 from "./sha256";
import * as Crypto from "expo-crypto";

const Upload = () => {
    const UPLOAD_ENDPOINT = "https://upload.starfiles.co/chunk";
    // const UPLOAD_ENDPOINT = "https://starfilesupload.requestcatcher.com/test"

    const uploadChunks = useCallback(async (chunks) => {
        const promises = chunks.map((chunk, index) => {
            // problem for later: order of chunks is not guaranteed, but is needed for reassembly
            // how do I keep track of this?
            const formData = new FormData();
            formData.append("chunk_hash", chunk.hash);

            // convert the blob to a file (the commented line below could be used if the server accepted blobs)
            // formData.append("upload", chunk.payload);
            const file = new File([chunk.payload], `chunk-${index}`, { type: "application/octet-stream" });
            formData.append("upload", file);

            console.log(formData);

            return fetch(UPLOAD_ENDPOINT, {
                method: "POST",
                body: formData,
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

    const getChunkFromBlob = useCallback(async (blob) => {
        return new Promise((resolve) => {
            const reader = new FileReader();

            reader.onloadend = async () => {
                const arrayBuffer = reader.result;
                const uint8Array = new Uint8Array(arrayBuffer);
   
                const hash = sha256(uint8Array);
                const payload = new Blob([uint8Array]);

                resolve({
                    payload: payload,
                    hash: hash,
                });
            }

            reader.readAsArrayBuffer(blob);
        });
    }, []);

    const prepareAndUploadBlob = useCallback(async (blob) => {
        const chunkSize = 2 * 1024 * 1024;
        const chunks = [];

        let offset = 0;
        while (offset < blob.size) {
            const payload = blob.slice(offset, offset + chunkSize);
            const chunk = await getChunkFromBlob(payload);
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
