# javascriptd

Node.js powered script execution daemon

## Using as runtime base

Javascriptd is typically run inside Docker. Out of the box it has nearly no Node.js
packages available. This is usually undesirable. So make a runtime image:

```
FROM progrium/javascriptd
RUN npm install -g github circlci bluebird
```

Now running your Javascriptd runtime image, scripts will have these packages
available.

## Using outside of Docker

The only reason Javascriptd is packaged and published on NPM is so you can use it
in development without Docker.

```
$ npm install javascriptd
```

Keep in mind it will have all your global packages available.

## Securing Javascriptd

To keep Javascriptd private, set environment variable `SECRET` and run it behind
SSL. HTTP requests will then require the header `x-runtime-secret`.

## Running scripts

The Javascriptd daemon exposes a [Duplex](https://github.com/progrium/duplex) JSON-over-WebSocket endpoint.
It has one method: `runtime.execute`.

### runtime.execute(script) => results

#### script

```
type script struct {
    code     string    // script contents
    globals  object    // optional globals
    call     string    // optional name of function to call
    caller   string    // optional caller function code
}
```

`code` is some JS you want to populate a context with and evaluate. `globals` is a object
that's used as the global context object. All keys of `globals` are available
to the script. `call` is the name of a function you want to call. This function
is not called directly, it's called with a caller.

The default caller looks like `function(callee, cb) { callee(cb); }`, where
`cb` is the callback to return a value, and `callee` is the function identified
by `call`. However, you can override this with `caller` so you can customize
how a function is called and set up more of the context for the call.

For example, this is a value for `caller` that will initialize a Github client,
authenticate with a token from globals, and call the callee with the Github
object, an event object from globals, and the callback as arguments:

```
(function(callee, cb) {
  var github = new require("github")();
  github.authenticate({
    type: "token",
    token: secrets.token
  });
  callee(github, event, cb);
})
```

#### result

```
type result struct {
    value     ?          // first argument of cb
    console   []string   // output from console.log
    time      number     // time to complete in milliseconds
}
```

#### errors

Possible Duplex errors include:

* `1000` **$exception** There was an exception in the script.
* `1001` **Not implemented** The function in `call` does not exist.
* `1002` **Timeout** The script and call timed out.

Errors may include a data object:

```
type errorData struct {
    stack     string     // stacktrace if available
    console   []string   // output from console.log
}
```
