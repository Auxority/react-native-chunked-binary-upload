import React, { useCallback } from "react";
import { View, Button } from "react-native";
import * as DocumentPicker from "expo-document-picker";
// import sha256 from "./sha256";
import * as FileSystem from "expo-file-system";
import { Base64 } from "js-base64";
import { sha256 } from "react-native-expo-sha256";

const Upload = () => {
    // const UPLOAD_ENDPOINT = "https://upload.starfiles.co/chunk";
    const UPLOAD_ENDPOINT = "https://starfilesupload.requestcatcher.com/test"

    const uploadChunks = useCallback(async (chunks) => {
        const promises = chunks.map((chunk, index) => {
            return new Promise((resolve) => {
                const uploadTask = FileSystem.createUploadTask(UPLOAD_ENDPOINT, chunk.uri, {
                    httpMethod: "POST",
                    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
                    headers: {
                        "Content-Type": "application/octet-stream",
                        "X-File-Name": `chunk-${index}`,
                        "X-File-Hash": chunk.hash,
                        "X-File-Index": String(index),
                        "X-File-Total": String(chunks.length),
                    },
                });

                const res = uploadTask.uploadAsync();
                resolve(res);
            });
        });

        try {
            const responses = await Promise.all(promises);
            // const data = await Promise.all(responses.map((response) => response.json()));
            // console.log(data);
        } catch (err) {
            console.error(`Chunk upload error: ${err}`);
        }

        // cleanup chunks that are saved to disk
        await Promise.all(chunks.map((chunk) => FileSystem.deleteAsync(chunk.uri)));
    }, []);

    const getChunkFromBlobSlice = useCallback(async (blobSlice) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onloadend = async () => {
                if (reader.error) {
                    reject(reader.error);
                    return;
                }

                const payload = new Uint8Array(reader.result);
                // const hash = sha256(payload);

                const base64Payload = Base64.fromUint8Array(payload);
                const uri = `${FileSystem.documentDirectory}-${hash}.chunk`;
                await FileSystem.writeAsStringAsync(
                    uri,
                    base64Payload, {
                    encoding: FileSystem.EncodingType.Base64
                });

                const hash = sha256(uri);
                console.log(`${hash} -> ${uri}`);

                resolve({
                    uri: uri,
                    hash: hash,
                });
            }

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
