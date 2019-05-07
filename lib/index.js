// node core modules

// 3rd party modules

// local modules

export const delay = (t, v) => new Promise(resolve => setTimeout(resolve.bind(null, v), t));

/**
 * Execute promise which is provided as a separate function in order to make a clean/original promise call.
 * If there was an error, log it and return rejected promise execution so it might be used again for retrial
 *
 * @param {Object} [logger]     Custom logger that can be provided
 * @returns {function(*=): Promise<T | {rejectedPromise: *, error: any, status: string}>}
 */
const reflectFactory = (logger = {}) =>
  executePromise =>
    executePromise()
      .then(data => ({ data, status: 'resolved' }))
      .catch((error) => {
        logger && logger.error('Reflect promise error: ', error);
        return { error, status: 'rejected', rejectedPromise: executePromise };
      });

/**
 * This method resolves all promises without failing, and logs an error if there is logger provided
 * The purpose is not to stop the execution of multiple promises only because some of them rejected
 *
 * @param {Array} listOfPromises      Array of promises, which are mapped into reflect function
 * @param {Object} [logger]           Custom logger that can be provided
 * @returns {Promise<any[]>}
 */
export const reflectAllPromises = (listOfPromises, logger) => {
  const reflect = reflectFactory(logger);
  return Promise.all(listOfPromises.map(reflect));
};

/**
 * This method runs promises in parallel, and if any of the promise executions fail it will be retried.
 * If maximum retry attempts is exceeded, the method will return all rejected promises so the caller may try again,
 * or use different custom strategy for resolving these rejected promises
 *
 * @param {Array} listOfPromises              A list of functions that return a promise
 * @param {Object} [logger]                   Custom logger that can be provided
 * @param {Object} retryParams                A configuration object, relevant for retrying mechanism
 * @param {Number} retryParams.maxAttempts    Maximum number of attempts by retry mechanism.
 *                                            If not provided, there will be no retries
 * @param {Number} retryParams.delay          Delay the method execution by certain period of time. The default value
 *                                            is 1000ms
 * @returns {Promise<any[]>}
 */
export const retryAllRejectedPromises = async (listOfPromises, retryParams, logger) => {
  const allPromises = await reflectAllPromises(listOfPromises, logger);

  const rejectedPromises = (allPromises || [])
    .filter(singlePromise => singlePromise.status === 'rejected')
    .map(({ rejectedPromise }) => rejectedPromise);

  if (rejectedPromises && rejectedPromises.length) {
    if (retryParams.maxAttempts > 0) {
      logger && logger.debug('Trying to run [%d] rejected promise(s), attempts left %d',
        rejectedPromises.length, retryParams.maxAttempts);

      retryParams.maxAttempts -= 1;

      await delay(retryParams.delay || 1000);
      return retryAllRejectedPromises(rejectedPromises, retryParams, logger);
    }

    logger && logger.debug('Failed to execute [%d] promise(s)', rejectedPromises.length);
    return rejectedPromises;
  }

  return [];
};

/**
 * This method runs promises in parallel, and if any of the promise executions fail it will be retried in next event loop iteration.
 * This also means that the execution will not stop, and the method will always resolve to true!
 * If maximum retry attempts is exceeded, the method will log an error message about number of rejected promise executions,
 * but it will NOT return rejected promises.
 *
 * @param {Array} listOfPromises              A list of functions that return a promise
 * @param {Object} logger                     Custom logger that can be provided
 * @param {Object} retryParams                A configuration object, relevant for retrying mechanism
 * @param {Number} retryParams.maxAttempts    Maximum number of attempts by retry mechanism.
 *                                            If not provided, there will be no retries
 * @param {Number} retryParams.delay          Delay the method execution by certain period of time. The default value
 *                                            is 1000ms
 * @returns {Promise<void>}
 */
export const reflectAndRetryAllRejectedPromises = async (listOfPromises, retryParams, logger) => {
  const allPromises = await reflectAllPromises(listOfPromises, logger);

  const rejectedPromises = (allPromises || [])
    .filter(singlePromise => singlePromise.status === 'rejected')
    .map(({ rejectedPromise }) => rejectedPromise);

  if (rejectedPromises && rejectedPromises.length) {
    if (retryParams.maxAttempts > 0) {
      setTimeout(async () => {
        logger && logger.debug('Trying to run [%d] rejected promise(s), attempts left %d',
          rejectedPromises.length, retryParams.maxAttempts);
        retryParams.maxAttempts -= 1;

        await reflectAndRetryAllRejectedPromises(rejectedPromises, retryParams, logger);
      }, retryParams.delay || 1000);
    } else {
      logger && logger.debug('Failed to execute [%d] promise(s)', rejectedPromises.length);
    }
  }
};
