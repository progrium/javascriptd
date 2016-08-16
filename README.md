# Runkit

Node.js powered scripting runtime

## Using as runtime base

Runkit is typically run inside Docker. Out of the box it has nearly no Node.js
packages available. This is usually undesirable. So make a runtime image:

```
FROM progrium/runkit
RUN npm install -g github circlci bluebird
```

Now running your Runkit runtime image, scripts will have these packages
available.

## Using outside of Docker

The only reason Runkit is packaged and published on NPM is so you can use it
in development without Docker.

```
$ npm install runkit
```

Keep in mind it will have all your global packages available.

## Running scripts

The Runkit engine exposes a [Duplex](https://github.com/progrium/duplex) JSON-over-WebSocket endpoint.
It has one method: `engine.execute`.

### engine.execute(input) => output

#### input

```
type input struct {
    script   string    // script contents
    globals  object    // optional globals
    call     string    // name of function to call
    caller   string    // optional caller
}
```

`script` is some JS you want to populate a context with. `globals` is a object
that's used as the global context object. All keys of `globals` are available
to the script. `call` is the name of a function you want to call. This function
is not called directly, it's called with a caller.

The default caller looks like `function(callee, cb) { callee(cb); }`, where
`cb` is the callback to return a value and `callee` is the function identified
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

#### output

```
type input struct {
    result   ?          // first argument of cb
    console  []string   // output from console.log
}
```

#### errors

Possible errors include:

 * `1001` **Not implemented** The function in `call` does not exist.
 * `1002` **Timeout** The script and call timed out.
 * `1003` **$exception** There was an exception. Data include stacktrace.
