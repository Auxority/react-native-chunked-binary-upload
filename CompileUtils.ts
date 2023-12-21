export default class CompileUtils {
    public static async compileFile(hashes: string[], fileId: string, fileName: string, makePublic: boolean = false) {
        const compileData = new FormData();
        compileData.append('compile_file', hashes.join(','));
        compileData.append('datauri', String(true));
        compileData.append('file_id', fileId);
        compileData.append('file_name', fileName);
        makePublic ? compileData.append('privacy', 'public') : null;

        try {
            const response = await fetch(`https://upload.starfiles.co/chunk?name=${fileId}`, {
                method: 'POST',
                body: compileData,
            });
            // UGLY HACK BELOW:
            let data = await response.text();
            if (data.includes('}{')) data = '{' + data.split('}{')[1];
            return JSON.parse(data);
        } catch (err) {
            throw new Error(`Error while compiling a file: ${err}`);
        }
    }
}