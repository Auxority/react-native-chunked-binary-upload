import { compileFromAsset } from './compile/CompileHelper';
import { selectFile } from './file/FileHelper';

export const startFileUpload = async (makePublic: boolean): Promise<string> => {
    const asset = await selectFile();
    return await compileFromAsset(asset, makePublic);
};
