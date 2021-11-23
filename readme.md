# promises-to-retry 
[![NPM info][nodei.co]](https://npmjs.org/package/promises-to-retry)
[![codecov](https://codecov.io/gh/futin/promises-to-retry/branch/master/graph/badge.svg)](https://codecov.io/gh/futin/promises-to-retry)
[![Build Status](https://travis-ci.com/futin/promises-to-retry.svg?branch=master)](https://travis-ci.com/futin/promises-to-retry)
[![NPM monthly downloads](https://img.shields.io/npm/dm/promises-to-retry.svg?style=flat)](https://npmjs.org/package/promises-to-retry) 
[![NPM total downloads](https://img.shields.io/npm/dt/promises-to-retry.svg?style=flat)](https://npmjs.org/package/promises-to-retry) 
> Simple utility library that provides retry/reflect mechanism for a list of promises

## Install

```sh
$ npm install promises-to-retry
```

### API

In order to use APIs, it is important to understand why it is required to wrap each promise in a function.

Once promise is resolved/rejected, it can't be reused again. It can't be sealed, frozen or deeply cloned in order to preserve the original state. And we need to retry the original promise upon rejection, not the rejected one!

That's why on every **retry** a function is being executed, and that function returns a new promise that can be again resolved/rejected!

Description of each API can be found below, as well as an example of how to use the method. Additionally, there are couple of tests provided which can serve as a guideline also.

Additionally [reflectAllPromises](#reflectallpromises--promisearrayany) can accept simple non-function promises if retry mechanism is not required.

## reflectAllPromises ⇒ <code>Promise.&lt;Array.&lt;any&gt;&gt;</code>
This method resolves all promises in parallel without failing, logs an error if there is logger provided and displays a final status of executed promise.
It can be "resolved" or "rejected". If "rejected", it also provides a reference to rejected function that returns a promise.
The purpose is to continue with the execution of all promises even if some of them were rejected.

**Kind**: global constant  

| Param | Type | Description |
| --- | --- | --- |
| listOfPromises | <code>Array</code> | Array of promises, which are mapped into reflect function |
| [logger] | <code>Object</code> | Custom logger that can be provided |

<a name="retryAllRejectedPromises"></a>

### example 

```js
const { reflectAllPromises } = require('promise-to-retry')
const errorPromise = () => Promise.reject(new Error('Some error happened'))
const validPromise = () => Promise.resolve({ I: 'am valid' })

const listOfPromises = [errorPromise, validPromise]
const result = await reflectAllPromises(listOfPromises)

console.log(result)
/*=========================================================*/
[ 
  { error: Error: Some error happened....
    status: 'rejected',
    rejectedPromise: [Function: errorPromise]
  },
  { data: { I: 'am valid' },
   status: 'resolved'
  }
]
/*=========================================================*/

```


## retryAllRejectedPromises ⇒ <code>Promise.&lt;Array.&lt;any&gt;&gt;</code>
This method runs promises in parallel, and collects all rejected promises. Once all rejected promises are collected,
the retry mechanism kicks-in and retries rejected promises (also in parallel) until there are no more attempts.
If maximum retry attempts is exceeded, the method will return all rejected promises so the caller may try to 
use different strategy for resolving them.

**Kind**: global constant  

| Param | Type | Description |
| --- | --- | --- |
| listOfPromises | <code>Array</code> | A list of functions that return a promise |
| retryParams | <code>Object</code> | A configuration object, relevant for retrying mechanism |
| retryParams.maxAttempts | <code>Number</code> | Maximum number of attempts by retry mechanism.                                            If not provided, there will be no retries |
| retryParams.delay | <code>Number</code> | Delay the method execution by certain period of time. The default value                                            is 1000ms |
| [logger] | <code>Object</code> | Custom logger that can be provided |

<a name="reflectAndRetryAllRejectedPromises"></a>

### example 

```js
const { retryAllRejectedPromises } = require('promise-to-retry')
const errorPromise = () => Promise.reject(new Error('Some error happened'))
const validPromise = () => Promise.resolve({ I: 'am valid' })

const listOfPromises = [errorPromise, validPromise, errorPromise]
const listOfParams = { maxAttempts: 3, delay: 1200 }

const result = await retryAllRejectedPromises(listOfPromises, listOfParams)

console.log(result)
/*=========================================================*/
[ 
 [Function: errorPromise],
 [Function: errorPromise]
]
/*=========================================================*/

```
## reflectAndRetryAllRejectedPromises ⇒ <code>Promise.&lt;void&gt;</code>
This method runs promises in parallel, and collects all rejected promises. Once all rejected promises are collected,
the retry mechanism kicks-in and retries rejected promises in **next the event loop** (also in parallel) until there are no more attempts.
This also means that the execution will not stop, and the method will always resolve to true!
If maximum retry attempts is exceeded, the method will log an error message about number of rejected promise executions,
but it will **not** return rejected promises.

This approach is faster then [retryAllRejectedPromises](#retryallrejectedpromises--promisearrayany) since it does not wait for all promises
to retry, and it should be used only if the execution of rejected promises is not essential for further execution

**Kind**: global constant  

| Param | Type | Description |
| --- | --- | --- |
| listOfPromises | <code>Array</code> | A list of functions that return a promise |
| retryParams | <code>Object</code> | A configuration object, relevant for retrying mechanism |
| retryParams.maxAttempts | <code>Number</code> | Maximum number of attempts by retry mechanism.                                            If not provided, there will be no retries |
| retryParams.delay | <code>Number</code> | Delay the method execution by certain period of time. The default value                                            is 1000ms |
| [logger] | <code>Object</code> | Custom logger that can be provided |

### example 

```js
const { reflectAndRetryAllRejectedPromises } = require('promise-to-retry')
const errorPromise = () => Promise.reject(new Error('Some error happened'))
const validPromise = () => Promise.resolve({ I: 'am valid' })

const listOfPromises = [errorPromise, validPromise, errorPromise]
const params = { maxAttempts: 3, delay: 1200 }

const result = await reflectAndRetryAllRejectedPromises(listOfPromises, params)

console.log(result)
/*=========================================================*/
undefined
/*=========================================================*/

```
## batchPromises(maxBatchSize, delayInMs, responseMode) ⇒ <code>function</code>
This method is batching list of promises. The batches are invoked with `reflectAllPromises`, so both resolved
and rejected results are kept. Based on `responseMode` you can receive different data. The method response is a function
which accepts `promises` array.

Available `ResponseMode` options:
 - ONLY_RESOLVED -> Response will contain only `resolved` promises.
 - ONLY_REJECTED -> Response will contain only `rejected` promises.
 - ALL           -> Response will contain all results. Order of execution is preserved.
 - ALL_SPLIT     -> Response will contain all results, where first item are `resolved`, and second are `rejected` promises.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| maxBatchSize | <code>Number</code> | Number of batches to be invoked in parallel |
| delayInMs | <code>Number</code> | Delay between batch execution |
| responseMode | <code>ResponseMode</code> | Different mode will provide different responses, depending on caller requirements. |

### example 

```js
const { batchPromises } = require('promise-to-retry')
const errorPromise = () => Promise.reject(new Error('Some error happened'))
const validPromise = () => Promise.resolve({ I: 'am valid' })

const listOfPromises = [errorPromise, validPromise, validPromise]
const params = { maxBatchSize: 2, delay: 100, responseMode: 'ONLY_RESOLVED' }

const result = await batchPromises(params)(listOfPromises)

console.log(result)
/*=========================================================*/
[
  { I: 'am valid' },
  { I: 'am valid' }
]
/*=========================================================*/

```
## racePromisesWithTime(listOfPromises, raceTimeoutInMs, raceTimeoutMessage, responseMode) ⇒ <code>Promise.&lt;Array.&lt;any&gt;&gt;</code>
For provided list of promises and `raceTimeoutInMs` method will execute promises in parallel and wait for the
response for certain amount of time. After time is out (based on `raceTimeoutInMs`) caller may decide what response
to receive. By default method returns only promises that "won" the timeout race. Otherwise it can return all
reflected promises including promises that "lost" the race.

An example of usage is for making http requests where the response time might differ. Caller might also request retrieving
"ONLY_RESOLVED" and handle promises that "lost" the race against time.
 
Available `ResponseMode` options:
 - ONLY_RESOLVED        -> Response will contain only `resolved` promises, including promises that "lost" the timeout race
 - ONLY_WINNER_PROMISES -> Response will contain only promises which "won" the race against time.
 - ALL                  -> Response will contain all results. Order of execution is preserved.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| listOfPromises | <code>Array</code> | A list of promises to race against time |
| raceTimeoutInMs | <code>Number</code> | The time in milliseconds that each promise will race against |
| raceTimeoutMessage | <code>String</code> | A custom message provided for promise which "lost" the race |
| responseMode | <code>ResponseMode</code> | Different mode will provide different responses, depending on caller requirements. |

### example 

```js
const { racePromisesWithTime } = require('promise-to-retry')
  const res1 = delay(1000, { I: 'got on time' });
  const res2 = delay(2000, { Me: 'too' });
  const res3 = delay(4000, 'too late');

  const listOfPromises = [res1, res2, res3];

  const response = await racePromisesWithTime({ listOfPromises, raceTimeoutInMs: 3000, responseMode: 'ONLY_RESOLVED' });

console.log(result)
/*=========================================================*/
[
  { I: 'got on time' },
  { Me: 'too' },
  { raceTimeoutMessage: 'Promise timeout limit reached', timeoutPromise: Promise }
]
/*=========================================================*/

```
## License

MIT © [Andreja Jevtic](https://github.com/futin)

[nodei.co]: https://nodei.co/npm/promises-to-retry.png?downloads=true
