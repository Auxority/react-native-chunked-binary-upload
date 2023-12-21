import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Upload from './Upload';

const App = () => (
  <View style={styles.container}>
    <Text>Upload files</Text>
    <Upload />
  </View>
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
