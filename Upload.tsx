import React, { View, Button } from 'react-native';
import { useCallback } from 'react';
import { startFileUpload } from './chunked-uploads';

const Upload = (): JSX.Element => {
  const uploadFile = useCallback(async () => {
    try {
      const makePublic = true; // TODO: Get from user input
      const fileId = await startFileUpload(makePublic);
      console.log(`File uploaded with ID: ${fileId}`);
    } catch (err) {
      console.error(`Upload error: ${String(err)}`); // TODO: Show an error message to the user?
      // alert(t('Upload failed, please try again later.'));
    }
  }, []);

  return (
        <View>
            <Button title='Upload File' onPress={() => { uploadFile().catch(console.error); }} />
        </View>
  );
};

export default Upload;
