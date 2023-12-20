import React, { useCallback } from "react";
import { View, Button } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { sha256 } from "js-sha256";

const Upload = () => {
    // const UPLOAD_ENDPOINT = "https://upload.starfiles.co/chunk";
    const UPLOAD_ENDPOINT = "https://starfilesupload.requestcatcher.com/test";
    const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB

    const createLimiter = (concurrency) => {
        let active = 0;
        const queue = [];

        return (task) => {
            return new Promise((resolve, reject) => {
                const runTask = () => {
                    active++;
                    task().then(resolve, reject).finally(() => {
                        active--;
                        if (queue.length > 0) {
                            queue.shift()();
                        }
                    });
                };

                if (active < concurrency) {
                    runTask();
                } else {
                    queue.push(runTask);
                }
            });
        };
    }

    const createChunk = useCallback(async (reader) => {
        const payload = new Uint8Array(reader.result);
        const hash = sha256(payload);
        console.log(`${hash} <- ${payload.length} bytes`);

        return {
            payload,
            hash,
        };
    }, []);

    const uploadChunk = async (chunk) => {
        const formData = new FormData();
        formData.append("upload", chunk.payload);
        formData.append("chunk_hash", chunk.hash);

        return fetch(UPLOAD_ENDPOINT, {
            method: "POST",
            body: formData,
        });
    }

    const doSomething123 = useCallback((blobSlice) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const chunk = createChunk(reader);
                resolve(uploadChunk(chunk));
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(blobSlice);
        });
    }, []);

    const doSomething = useCallback((blob, offset) => {
        const blobSlice = blob.slice(offset, offset + CHUNK_SIZE);
        return doSomething123(blobSlice);
    }, []);

    const uploadChunks = useCallback(async (blob) => {
        const limit = createLimiter(5);
        const tasks = [];

        for (let offset = 0; offset < blob.size; offset += CHUNK_SIZE) {
            tasks.push(limit(() => doSomething(blob, offset)));
        }

        try {
            await Promise.all(tasks);
        } catch (err) {
            console.error(`Upload error: ${err}`);
        }
    }, []);

    const uploadAsset = useCallback(async (asset) => {
        try {
            const file = await fetch(asset.uri);
            const blob = await file.blob();
            await uploadChunks(blob);
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
