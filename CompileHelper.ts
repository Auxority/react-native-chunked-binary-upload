import { Chunk } from './ChunkHelper';
import { UPLOAD_ENDPOINT, UPLOAD_HTTP_METHOD } from './UploadConstants';
import { createChunksFromUri } from './ChunkHelper';
import { uploadChunks } from './UploadHelper';
import { DocumentPickerAsset } from 'expo-document-picker';

export type CompileResponse = {
    status: boolean;
    missing_chunks: string[];
    file?: string;
};

const COMPILE_FAILED_ERROR = 'Failed to compile file';

const createCompileForm = (hashes: string[], fileName: string, makePublic: boolean) => {
    const fileId = Math.random().toString(36).substring(2, 18);

    const compileData = new FormData();
    compileData.append('compile_file', hashes.join(','));
    compileData.append('datauri', String(true));
    compileData.append('file_id', fileId);
    compileData.append('file_name', fileName);
    makePublic ? compileData.append('privacy', 'public') : null;

    return compileData;
};

const createUrlParameters = (fileName: string): string => {
    return new URLSearchParams({ name: fileName }).toString();
};

const parseCompileResponse = async (response: Response) => {
    // If the response includes '}{', it means the server is returning multiple JSON objects concatenated together.
    // This is not valid JSON, so we need to split the response and parse each JSON object separately.
    // TODO: Handle this on the server side if possible.
    let data = await response.text();
    if (data.includes('}{')) {
        data = `{${data.split('}{')[1]}`;
    }

    return JSON.parse(data);
}

const fetchCompileResponse = async (compileData: FormData, urlParameters: string) => {
    const response = await fetch(`${UPLOAD_ENDPOINT}?${urlParameters}`, {
        method: UPLOAD_HTTP_METHOD,
        body: compileData,
    });

    return await parseCompileResponse(response);
}

const compileFileFromHashes = async (
    hashes: string[],
    fileName: string,
    makePublic: boolean = false,
): Promise<CompileResponse> => {
    const compileData = createCompileForm(hashes, fileName, makePublic);
    const urlParameters = createUrlParameters(fileName);
    return await fetchCompileResponse(compileData, urlParameters);
};

const compileFileFromChunks = async (
    chunks: Chunk[],
    name: string,
    makePublic: boolean,
): Promise<CompileResponse> => {
    const hashes = chunks.map((chunk) => chunk.hash);
    return await compileFileFromHashes(hashes, name, makePublic);
};

const compileAndCheckFile = async (chunks: Chunk[], fileName: string, makePublic: boolean): Promise<string> => {
    const response = await compileFileFromChunks(chunks, fileName, makePublic);
    if (!response.file) {
        console.log(response);
        throw new Error(COMPILE_FAILED_ERROR);
    }

    // const missingHashes = response.missing_chunks;
    // console.log(response);

    return response.file;
};

export const compileFromAsset = async (
    asset: DocumentPickerAsset,
    makePublic: boolean = false,
): Promise<string> => {
    const chunks = await createChunksFromUri(asset.uri);
    await uploadChunks(chunks);
    return await compileAndCheckFile(chunks, asset.name, makePublic);
    // try {
    //     return await compileAndCheckFile(chunks, asset.name, makePublic);
    // } catch (error) {
    //     await uploadChunks(chunks);
    //     return await compileAndCheckFile(chunks, asset.name, makePublic);
    // }
};
