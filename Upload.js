import React, { useCallback, useContext } from "react";
import { View, Button } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { UploadyContext, useItemStartListener, useItemProgressListener, useItemErrorListener, useItemFinishListener } from "@rpldy/native-uploady";

const Upload = () => {
  const uploadyContext = useContext(UploadyContext);

  useItemStartListener((item) => {
    console.log(`Starting to upload a new file ${item.id}!`);
    console.log(item);
  });

  useItemProgressListener((item) => {
    console.log(`Progress for ${item.id}: ${item.loaded} / ${item.total}`);
  });

  useItemErrorListener((item) => {
    console.log(`Error uploading file ${item.id}: ${item.uploadResponse}`);
  });

  useItemFinishListener((item) => {
    console.log(`Finished uploading file ${item.id}!`);
  });

  const pickDocument = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled === true || result.assets.length === 0) {
      return;
    }

    const asset = result.assets[0];

    try {
      const file = await fetch(asset.uri);
      const blob = await file.blob();
      const fixedBlob = new Blob([blob], { type: "application/octet-stream" });

      uploadyContext.upload(fixedBlob, {
        sendWithFormData: true,
        params: {
          fileName: asset.name,
        },
      });
    } catch (err) {
      console.log(`upload error: ${err}`);
    }
  }, [uploadyContext]);

  return (
    <View>
      <Button title="Upload File" onPress={pickDocument} />
    </View>
  );
};

export default Upload;
