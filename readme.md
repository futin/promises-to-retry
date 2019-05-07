# promise-to-retry
> Utility library that help with performing multiple promise-based operations

## Install

```sh
$ npm install promise-to-retry
```

## Usage

Each usage can be found in the API description below. 

### API

## reflectAllPromises ⇒ <code>Promise.&lt;Array.&lt;any&gt;&gt;</code>
This method resolves all promises without failing, and logs an error if there is logger provided
The purpose is not to stop the execution of multiple promises only because some of them rejected

**Kind**: global constant  

| Param | Type | Description |
| --- | --- | --- |
| listOfPromises | <code>Array</code> | Array of promises, which are mapped into reflect function |
| [logger] | <code>Object</code> | Custom logger that can be provided |

<a name="retryAllRejectedPromises"></a>

### example 

```sh
import { reflectAllPromises } from '
const [{ status, error, rejectedPromise }] = await reflectAllPromises([errorPromise], logger);
```


## retryAllRejectedPromises ⇒ <code>Promise.&lt;Array.&lt;any&gt;&gt;</code>
This method runs promises in parallel, and if any of the promise executions fail it will be retried.
If maximum retry attempts is exceeded, the method will return all rejected promises so the caller may try again,
or use different custom strategy for resolving these rejected promises

**Kind**: global constant  

| Param | Type | Description |
| --- | --- | --- |
| listOfPromises | <code>Array</code> | A list of functions that return a promise |
| [logger] | <code>Object</code> | Custom logger that can be provided |
| retryParams | <code>Object</code> | A configuration object, relevant for retrying mechanism |
| retryParams.maxAttempts | <code>Number</code> | Maximum number of attempts by retry mechanism.                                            If not provided, there will be no retries |
| retryParams.delay | <code>Number</code> | Delay the method execution by certain period of time. The default value                                            is 1000ms |

<a name="reflectAndRetryAllRejectedPromises"></a>

## reflectAndRetryAllRejectedPromises ⇒ <code>Promise.&lt;void&gt;</code>
This method runs promises in parallel, and if any of the promise executions fail it will be retried in next event loop iteration.
This also means that the execution will not stop, and the method will always resolve to true!
If maximum retry attempts is exceeded, the method will log an error message about number of rejected promise executions,
but it will NOT return rejected promises.

**Kind**: global constant  

| Param | Type | Description |
| --- | --- | --- |
| listOfPromises | <code>Array</code> | A list of functions that return a promise |
| logger | <code>Object</code> | Custom logger that can be provided |
| retryParams | <code>Object</code> | A configuration object, relevant for retrying mechanism |
| retryParams.maxAttempts | <code>Number</code> | Maximum number of attempts by retry mechanism.                                            If not provided, there will be no retries |
| retryParams.delay | <code>Number</code> | Delay the method execution by certain period of time. The default value                                            is 1000ms |

<a name="reflectFactory"></a>

## reflectFactory([logger]) ⇒ <code>function</code>
Execute promise which is provided as a separate function in order to make a clean/original promise call.
If there was an error, log it and return rejected promise execution so it might be used again for retrial

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| [logger] | <code>Object</code> | Custom logger that can be provided |

