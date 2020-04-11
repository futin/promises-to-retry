// node core modules

// 3rd party modules

// local modules
const { responseByMode } = require('./utils');

const delay = (t, v) => new Promise(resolve => setTimeout(resolve.bind(null, v), t));

/**
 * Execute promise which is provided as a separate function in order to make a clean/original promise call.
 * If there was an error, log it and return rejected promise execution so it might be used again for retrial
 *
 * @param {Object} [logger]     Custom logger that can be provided
 * @returns {function(*=): Promise<T | {rejectedPromise: *, error: any, status: string}>}
 */
const reflectFactory = (logger) =>
  executePromise => {
    if (typeof executePromise === 'function') {
      return executePromise()
        .then(data => ({ data, status: 'resolved' }))
        .catch((error) => {
          logger && logger.error('Reflect promise error: ', error);
          return { error, status: 'rejected', rejectedPromise: executePromise };
        });
    }

    return executePromise.then(data => ({ data, status: 'resolved' }))
      .catch((error) => {
        logger && logger.error('Reflect promise error: ', error);
        return { error, status: 'rejected' };
      });
  };

/**
 * This method resolves all promises without failing, logs an error if there is logger provided and displays a final status of executed promise.
 * It can be "resolved" or "rejected". If "rejected", it also provides a reference to rejected function that returns a promise.
 * The purpose is to continue with the execution of all promises even if some of them were rejected
 *
 * @param {Array} listOfPromises      Array of promises, which are mapped into reflect function
 * @param {Object} [logger]           Custom logger that can be provided
 * @returns {Promise<any[]>}
 */
const reflectAllPromises = (listOfPromises, logger) => {
  const reflect = reflectFactory(logger);
  return Promise.all(listOfPromises.map(reflect));
};

/**
 * This method runs promises in parallel, and collects all rejected promises. Once all rejected promises are collected,
 * the retry mechanism kicks-in and retries rejected promises (also in parallel) until there are no more attempts.
 * If maximum retry attempts is exceeded, the method will return all rejected promises so the caller may try to
 * use different strategy for resolving them.
 *
 * @param {Array} listOfPromises              A list of functions that return a promise
 * @param {Object} retryParams                A configuration object, relevant for retrying mechanism
 * @param {Number} retryParams.maxAttempts    Maximum number of attempts by retry mechanism.
 *                                            If not provided, there will be no retries
 * @param {Number} retryParams.delay          Delay the method execution by certain period of time. The default value
 *                                            is 1000ms
 * @param {Object} [logger]                   Custom logger that can be provided
 * @returns {Promise<any[]>}
 */
const retryAllRejectedPromises = async (listOfPromises, retryParams, logger) => {
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
 * This method runs promises in parallel, and collects all rejected promises. Once all rejected promises are collected,
 * the retry mechanism kicks-in and retries rejected promises in NEXT the event loop (also in parallel) until there are no more attempts.
 * This also means that the execution will not stop, and the method will always resolve to true!
 * If maximum retry attempts is exceeded, the method will log an error message about number of rejected promise executions,
 * but it will NOT return rejected promises.
 *
 * @param {Array} listOfPromises              A list of functions that return a promise
 * @param {Object} retryParams                A configuration object, relevant for retrying mechanism
 * @param {Number} retryParams.maxAttempts    Maximum number of attempts by retry mechanism.
 *                                            If not provided, there will be no retries
 * @param {Number} retryParams.delay          Delay the method execution by certain period of time. The default value
 *                                            is 1000ms
 * @param {Object} [logger]                   Custom logger that can be provided
 * @returns {Promise<void>}
 */
const reflectAndRetryAllRejectedPromises = async (listOfPromises, retryParams, logger) => {
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

/**
 * This method is batching list of promises. The batches are invoked with `reflectAllPromises`, so both resolved
 * and rejected results are kept. Based on `responseMode` you can receive different data.
 *
 * @param {Number} maxBatchSize                   Number of batches to be invoked in parallel
 * @param {Number} delayInMs                      Delay between batch execution
 * @param {(
 * 'ONLY_RESOLVED' | 'ONLY_REJECTED' |
 *  'ALL' | 'ALL_SPLIT'
 * )} responseMode                                Different mode will provide different responses,
 *                                                depending on caller requirements.
 * @returns {Function}
 */
const batchPromises = ({ maxBatchSize = 2, delayInMs = 1000, responseMode = 'ALL' }) =>
  /**
   * @param {Array} promises        List of promises to batch
   * @returns {Promise<any[]>}
   */
  async promises => {
    if (!Object.keys(responseByMode).includes(responseMode)) {
      throw new Error('Invalid responseMode provided');
    }
    let allPromises = [];
    const resolvedPromises = [];
    const rejectedPromises = [];

    // prepare the batches
    const promiseBatches = promises.reduce((result, singlePromise) => {
      if (result[result.length - 1].length < maxBatchSize) {
        result[result.length - 1].push(singlePromise);
        return result;
      }

      result[result.length] = [singlePromise];
      return result;
    }, [[]]);

    for (const promiseBatch of promiseBatches) {
      const executedPromises = await reflectAllPromises(promiseBatch);
      executedPromises.forEach(({ status, data, error }) =>
        status === 'rejected'
          ? rejectedPromises.push(error)
          : resolvedPromises.push(data));

      allPromises.push(...executedPromises);
      await delay(delayInMs);
    }

    allPromises = allPromises.map(({ data, error }) => data || error);
    return responseByMode[responseMode]({ resolvedPromises, rejectedPromises, allPromises });
  };

/**
 * For provided list of promises and `raceTimeoutInMs` method will execute promises in parallel and wait for the
 * response for certain amount of time. After time is out (based on `raceTimeoutInMs`) caller may decide what response
 * to receive. By default method returns only promises that "won" the timeout race. Otherwise it can return all
 * reflected promises including promises that "lost" the race.
 *
 * @param {Array} listOfPromises                  A list of promises to race with time
 * @param {Number} [raceTimeoutInMs]              Time that each promise will race with
 * @param {String} [raceTimeoutMessage]           Customer message provided with timed out promise
 * @param {(
 * 'ONLY_RESOLVED' | 'ONLY_WINNER_PROMISES' | 'ALL'
 * )} responseMode                                Different mode will provide different responses,
 *                                                depending on caller requirements.
 * @returns {Promise<any[]>}
 */
const racePromisesWithTime = async ({ listOfPromises, raceTimeoutInMs = 1000, raceTimeoutMessage = 'Promise timeout limit reached', responseMode = 'ONLY_WINNER_PROMISES' }) => {
  const allPromises = await reflectAllPromises(listOfPromises.map(promise =>
    Promise.race([promise, delay(raceTimeoutInMs, { timeoutPromise: promise, raceTimeoutMessage })]))
  );

  const resolvedPromises = allPromises
    .map(({ data }) => data)
    .filter(Boolean);

  const winnerPromises = resolvedPromises
    .filter(data => data && !data.timeoutPromise);

  return responseByMode[responseMode]({ resolvedPromises, winnerPromises, allPromises });
};

module.exports = {
  reflectAllPromises,
  retryAllRejectedPromises,
  reflectAndRetryAllRejectedPromises,
  batchPromises,
  racePromisesWithTime,
  delay
};
