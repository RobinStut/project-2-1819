# Promise streaming (Concurrency)
A _PromiseStream_ is a class that allows the "piping" of promises through functions. It is not like a Node Stream, since those require you to pipe into another stream. For those who understand streams, they are almost the same, just with functions. For those who do not know streams, let me introduce to you the wonderful world of streams! 😍

## How to use
To create a PromiseStream through the wrapper, you simply call its method `createStream`, which will return a promise that resolves into a new PromiseStream. The stream has several methods:

##### <code>PromiseStream.prepend (*any[]:* ...values) -> PromiseStream</code>
Inserts values at the beginning of the stream. `values` do not have to be promises, the stream will internally convert all values to promises.

##### <code>PromiseStream.append (*any[]:* ...values) -> PromiseStream</code>
Inserts values at the end of the stream. `values` do not have to be promises, the stream will internally convert all values to promises.

##### <code>PromiseStream.insert (*number*: index?, *any[]:* ...values) -> PromiseStream</code>
Inserts values into the stream at `index`. `values` do not have to be promises, the stream will internally convert all values to promises. If `index` is not provided, it will be treated as `values`.

##### <code>PromiseStream.pipe (*function:* through) -> PromiseStream</code>
⚠️ _Does not pipe in order!_

Runs a function `through` for every resolved promise in the stream. Accepts both synchronous and asynchronous functions. Returns a new stream filled with promises that resolve to the value of `through`, so you can chain them (and use previous values).

An example:
```js
//Imagine the functions toJson, cleanJSON and
//renderToDocument exist, and do what their
//name says.
const stream = new PromiseStream([
	fetch("url1"),
	fetch("url2"),
	fetch("url3")
]);

stream
  .pipe(toJSON)
	.pipe(renderToDocument)
	.catch(handleError);
```

##### <code>PromiseStream.pipeOrdered(*function:* through) -> PromiseStream</code>
Runs a function `through` for every resolved promise in the stream, waiting for each previous resolvement. Accepts both synchronous and asynchronous functions. Returns a new stream filled with promises that resolve to the value of `through`, so you can chain them (and use previous values).

##### <code>PromiseStream.all () -> Promise<Any[]></code>
Shorthand for calling `Promise.all(stream.promises)`.

##### <code>PromiseStream.catch (*function:* handler) -> PromiseStream</code>
Adds a `.catch()` to every promise to allow for individual error handling. If you just want to handle all errors at once, use `.all().catch()`.