// node core modules

// 3rd party modules
const test = require('ava');
const sinon = require('sinon');

// local modules
const {
  reflectAllPromises, retryAllRejectedPromises, reflectAndRetryAllRejectedPromises, delay
} = require('./lib');

test.beforeEach((t) => {
  const logger = {
    debug: value => value,
    error: value => value
  };

  Object.assign(t.context, { logger });
});

test('Verify that reflectAllPromises does not throw an error', async (t) => {
  const errorPromise = () => Promise.reject(new Error('Throw error'));
  const { logger } = t.context;

  const loggerErrorSpy = sinon.spy(logger, 'error');

  const [{ status, error, rejectedPromise }] = await reflectAllPromises([errorPromise], logger);

  t.is(status, 'rejected');
  t.is(typeof rejectedPromise, 'function');
  t.is(error.message, 'Throw error');

  t.true(loggerErrorSpy.calledWith('Reflect promise error: '));
  t.true(loggerErrorSpy.calledOnce);
});

test('Verify that reflectAllPromises does not throw an error when non-function is provided as promise', async (t) => {
  const { logger } = t.context;

  const loggerErrorSpy = sinon.spy(logger, 'error');

  const [{ status, error, rejectedPromise }] = await reflectAllPromises([Promise.reject(new Error('Throw error'))], logger);

  t.is(status, 'rejected');
  t.is(rejectedPromise, undefined, 'rejectedPromise is not provided in this case');
  t.is(error.message, 'Throw error');

  t.true(loggerErrorSpy.calledWith('Reflect promise error: '));
  t.true(loggerErrorSpy.calledOnce);
});

test('Verify that reflectAllPromises returns resolved promises', async (t) => {
  const { logger } = t.context;
  const mockResponse = { a: 'b' };
  const loggerErrorSpy = sinon.spy(logger, 'error');

  const validResponse = () => Promise.resolve(mockResponse);

  const [{ status, data }] = await reflectAllPromises([validResponse], logger);

  t.is(status, 'resolved');
  t.is(typeof data, 'object');
  t.deepEqual(data, mockResponse);
  t.false(loggerErrorSpy.calledOnce);
});

test('Verify that reflectAllPromises returns resolved promises when non-function is provided', async (t) => {
  const { logger } = t.context;
  const mockResponse = { a: 'b' };
  const loggerErrorSpy = sinon.spy(logger, 'error');

  const [{ status, data }] = await reflectAllPromises([Promise.resolve(mockResponse)], logger);

  t.is(status, 'resolved');
  t.is(typeof data, 'object');
  t.deepEqual(data, mockResponse);
  t.false(loggerErrorSpy.calledOnce);
});

test('Verify that retryAllPromises works without retryParams', async (t) => {
  const { logger } = t.context;
  const mockResponse = { a: 'b' };
  const loggerErrorSpy = sinon.spy(logger, 'error');

  const validResponse = () => Promise.resolve(mockResponse);

  await retryAllRejectedPromises([validResponse], logger);

  t.false(loggerErrorSpy.calledOnce);
});

test('Verify that retryAllPromises retries for the number of provided attempts before failing', async (t) => {
  const { logger } = t.context;
  const errorPromise = () => Promise.reject(new Error('Throw error'));
  const loggerErrorSpy = sinon.spy(logger, 'error');
  const maxAttempts = 2;
  const retryParams = { maxAttempts, delay: 10 };

  const result = await (retryAllRejectedPromises([errorPromise], retryParams, logger));

  t.is(result.length, 1);
  t.is(loggerErrorSpy.callCount, maxAttempts + 1);
});

test('Verify that retryAllPromises retries only failed promises', async (t) => {
  const { logger } = t.context;
  const errorPromise = () => Promise.reject(new Error('Throw error'));
  const validResponse = () => Promise.resolve({});

  const maxAttempts = 1;
  const retryParams = { maxAttempts, delay: 10 };

  const result = await (retryAllRejectedPromises([errorPromise, validResponse, errorPromise], retryParams, logger));

  t.is(result.length, 2);
});

test('Verify that reflectAndRetryAllRejectedPromises never throws an error', async (t) => {
  const { logger } = t.context;
  const errorPromise = () => Promise.reject(new Error('Throw error'));
  const validResponse = () => Promise.resolve({});
  const loggerErrorSpy = sinon.spy(logger, 'error');

  const maxAttempts = 2;
  const retryParams = { maxAttempts, delay: 10 };

  await reflectAndRetryAllRejectedPromises([errorPromise, validResponse, errorPromise], retryParams, logger);
  t.is(loggerErrorSpy.callCount, 2, 'For initial execution there should be 2 error log calls');

  await delay(300);

  // we try to execute failed promises after in next event loops
  t.is(loggerErrorSpy.callCount, 6, 'For each retry attempt there should be more logs per execution');
});
