import { uploadAndCompileFromAsset } from './compile/CompileHelper';
import { selectFile } from './file/FileHelper';

export const startFileUpload = async (
  makePublic: boolean,
  onHashingProgress?: (progress: number) => void,
  onUploadProgress?: (progress: number) => void
): Promise<string> => {
  const asset = await selectFile();
  return await uploadAndCompileFromAsset(
    asset,
    makePublic,
    onHashingProgress,
    onUploadProgress
  );
};
