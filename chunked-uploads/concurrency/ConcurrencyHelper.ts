export const limitConcurrency = async <T>(tasks: (() => Promise<T>)[], maxConcurrency: number): Promise<T[]> => {
    const results: Promise<T>[] = [];
    const executing: Promise<void>[] = [];
    for (const task of tasks) {
        const p = Promise.resolve().then(() => task());
        results.push(p);
        if (maxConcurrency <= tasks.length) {
            const e: any = p.then(() =>
                executing.splice(executing.indexOf(e), 1)
            );
            executing.push(e);
            if (executing.length >= maxConcurrency) {
                await Promise.race(executing);
            }
        }
    }
    return Promise.all(results);
};