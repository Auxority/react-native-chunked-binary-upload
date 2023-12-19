// import the Upload.js component and create a simple UI to render it:
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import NativeUploady from "@rpldy/native-uploady";
import Upload from "./Upload";
import { composeEnhancers } from "@rpldy/uploader";
import ChunkedSender from "@rpldy/chunked-sender";

const customChunkedSender = ChunkedSender({
  chunked: true,
  chunkSize: 2 * 1024 * 1024, // 2MB
  retries: 0, // TODO: change to 3
  parallel: 0,
});

const enhancers = composeEnhancers(customChunkedSender);

const App = () => (
  <NativeUploady
    enhancers={enhancers}
    destination={{ url: "https://starfilesupload.requestcatcher.com/test" }}
  >
    <View style={styles.container}>
      <Text>Upload files</Text>
      <Upload />
    </View>
  </NativeUploady>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default App;
