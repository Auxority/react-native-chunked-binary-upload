export const limitConcurrency = async (promises: (() => Promise<any>)[], maxConcurrency: number): Promise<any[]> => {
    let activeTasks = 0;
    let finishedTasks = 0;
    const results: any[] = [];
    const processQueue = (): any[] => {
        if (promises.length === 0 && activeTasks === 0) {
            return results;
        }
        while (activeTasks < maxConcurrency && promises.length > 0) {
            activeTasks++;
            const taskIndex = finishedTasks + activeTasks - 1;
            const task = promises.shift()!;
            task()
                .then(result => {
                    activeTasks--;
                    finishedTasks++;
                    results[taskIndex] = result;
                    processQueue();
                })
                .catch(console.error);
        }
        return [];
    };
    processQueue();
    return results;
};