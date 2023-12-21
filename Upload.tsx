import { View, Button } from 'react-native';
import React, { useCallback } from 'react';

import UploadUtils from './UploadUtils';

const Upload = () => {
    const startFileUpload = useCallback(async () => {
        try {
            let fileName = 'test.ipa'; // TODO: Get the file name from user input
            let makePublic = true; // TODO: Get the makePublic value from user input
            await UploadUtils.startFileUpload(fileName, makePublic);
        } catch (err) {
            // TODO: Show an error message to the user?
            console.error(`An error occurred while uploading a file: ${err}`);
        }
    }, []);

    return (
        <View>
            <Button title='Upload File' onPress={startFileUpload} />
        </View>
    );
};

export default Upload;
