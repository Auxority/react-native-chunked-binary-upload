import { DocumentPickerAsset } from 'expo-document-picker';
import { Chunk } from '../chunk/ChunkTypes';
import { COMPILE_FAILED_ERROR } from './CompileConstants';
import { CompileResponse } from './CompileTypes';
import { createChunksFromUri } from '../chunk/ChunkHelper';
import { UPLOAD_ENDPOINT, UPLOAD_HTTP_METHOD } from '../upload/UploadConstants';
import { uploadChunks } from '../upload/UploadHelper';

const createCompileForm = (chunkHashes: string[], fileName: string, makePublic: boolean) => {
    const fileId = Math.random().toString(36).substring(2, 18);

    const compileData = new FormData();
    compileData.append('compile_file', chunkHashes.join(','));
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
};

const fetchCompileResponse = async (compileData: FormData, urlParameters: string) => {
    const response = await fetch(`${UPLOAD_ENDPOINT}?${urlParameters}`, {
        method: UPLOAD_HTTP_METHOD,
        body: compileData,
    });

    return await parseCompileResponse(response);
};

const getFileFromHashes = async (
    chunkHashes: string[],
    fileName: string,
    makePublic: boolean,
): Promise<string> => {
    const response = await compileFileFromHashes(chunkHashes, fileName, makePublic);
    if (!response.file) {
        throw COMPILE_FAILED_ERROR;
    }

    return response.file;
};

const checkCompiledChunks = async (
    chunks: Chunk[],
    fileName: string,
    makePublic: boolean,
): Promise<CompileResponse> => {
    const chunkHashes = chunks.map((chunk) => chunk.hash);
    return await compileFileFromHashes(chunkHashes, fileName, makePublic);
};

const filterChunks = (chunkHashes: string[], chunks: Chunk[]): Chunk[] => {
    return chunks.filter((chunk) => chunkHashes.includes(chunk.hash))
};

const compileMissingChunks = async (
    missingChunkHashes: string[],
    chunks: Chunk[],
    fileName: string,
    makePublic: boolean
): Promise<string> => {
    const filteredChunks = filterChunks(missingChunkHashes, chunks);
    await uploadChunks(filteredChunks);
    return await getFileFromHashes(missingChunkHashes, fileName, makePublic);
};

export const compileFileFromHashes = async (
    chunkHashes: string[],
    fileName: string,
    makePublic: boolean = false,
): Promise<CompileResponse> => {
    const compileData = createCompileForm(chunkHashes, fileName, makePublic);
    const urlParameters = createUrlParameters(fileName);
    return await fetchCompileResponse(compileData, urlParameters);
};

export const compileFileFromChunks = async (
    chunks: Chunk[],
    fileName: string,
    makePublic: boolean,
): Promise<CompileResponse> => {
    const chunkHashes = chunks.map((chunk) => chunk.hash);
    return await compileFileFromHashes(chunkHashes, fileName, makePublic);
};

export const compileFromAsset = async (
    asset: DocumentPickerAsset,
    makePublic: boolean = false,
): Promise<string> => {
    const chunks = await createChunksFromUri(asset.uri);
    const response = await checkCompiledChunks(chunks, asset.name, makePublic);
    if (response.file) {
        console.log('File already compiled!');
        return response.file;
    }

    return await compileMissingChunks(response.missing_chunks, chunks, asset.name, makePublic);
};
