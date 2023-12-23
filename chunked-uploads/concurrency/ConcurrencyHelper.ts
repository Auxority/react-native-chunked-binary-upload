const manageConcurrency = async <T>(e: Promise<void>, p: Promise<T>, executing: Promise<void>[], maxConcurrency: number): Promise<void> => {
    e = p.then(() => {
        executing.splice(executing.indexOf(e), 1);
        return Promise.resolve();
    });
    executing.push(e);
    if (executing.length >= maxConcurrency) {
        await Promise.race(executing);
    }
    return e;
}

const executeTask = async <T>(task: () => Promise<T>, results: Promise<T>[], executing: Promise<void>[], maxConcurrency: number) => {
    const p = Promise.resolve().then(() => task());
    results.push(p);

    let e: Promise<void> = Promise.resolve();
    if (maxConcurrency <= results.length) {
        e = manageConcurrency<T>(e, p, executing, maxConcurrency);
    }
};

export const limitConcurrency = async <T>(tasks: (() => Promise<T>)[], maxConcurrency: number): Promise<T[]> => {
    const results: Promise<T>[] = [];
    const executing: Promise<void>[] = [];

    for (const task of tasks) {
        await executeTask(task, results, executing, maxConcurrency);
    }

    return Promise.all(results);
};
