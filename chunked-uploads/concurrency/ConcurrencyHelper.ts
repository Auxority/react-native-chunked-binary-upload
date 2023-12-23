const manageConcurrency = async <T>(e: Promise<void>, p: Promise<T>, executing: Array<Promise<void>>, maxConcurrency: number): Promise<void> => {
  e = p.then(async () => {
    executing.splice(executing.indexOf(e), 1);
    await Promise.resolve();
  });
  executing.push(e);
  if (executing.length >= maxConcurrency) {
    await Promise.race(executing);
  }
  await e;
};

const executeTask = async <T>(task: () => Promise<T>, results: Array<Promise<T>>, executing: Array<Promise<void>>, maxConcurrency: number): Promise<void> => {
  const p = Promise.resolve().then(async () => await task());
  results.push(p);

  if (maxConcurrency <= results.length) {
    const e: Promise<void> = Promise.resolve();
    manageConcurrency<T>(e, p, executing, maxConcurrency).catch(console.error);
  }
};

export const limitConcurrency = async <T>(tasks: Array<() => Promise<T>>, maxConcurrency: number): Promise<T[]> => {
  const results: Array<Promise<T>> = [];
  const executing: Array<Promise<void>> = [];

  for (const task of tasks) {
    await executeTask(task, results, executing, maxConcurrency);
  }

  return await Promise.all(results);
};
