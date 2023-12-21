import { View, Button } from 'react-native';
import React, { useCallback } from 'react';
import { selectFile } from './FileHandler';
import { compileFromAsset } from './CompileHelper';
import DocumentPicker from 'expo-document-picker';

const Upload = () => {
    const startFileUpload = useCallback(async () => {
        let asset: DocumentPicker.DocumentPickerAsset;
        try {
            asset = await selectFile();
        } catch (err) {
            return;
        }

        try {
            let makePublic = true; // TODO: Get the makePublic value from user input

            const file = await compileFromAsset(asset, makePublic);
            console.log(`Upload successful, file: ${file}`);
        } catch (err) {
            // TODO: Show an error message to the user?
            console.error(`Upload error: ${err}`);
            // alert(t('Upload failed, please try again later.'));
        }
    }, []);

    return (
        <View>
            <Button title='Upload File' onPress={startFileUpload} />
        </View>
    );
};

export default Upload;
