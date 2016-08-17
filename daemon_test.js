var assert = require('assert');
var ws = require("nodejs-websocket");
var {duplex} = require("./duplex.js");

process.env["NOLOGS"] = process.env["NOLOGS"] || "true";
process.env["PORT"] = process.env["PORT"] || "8765";
require("./daemon.js");

const errNotImplemented = {code: 1001, message: "Not implemented"};
const errTimeout = {code: 1002, message: "Timeout"};

var execTests = [
  {name: "notImplemented",
    script: {code: ""},
    error: errNotImplemented
  },
  {name: "callbackNoArg",
    script: {code: (function callbackNoArg(cb) {
      cb();
    }).toString()}
  },
  {name: "callbackIgnoreMultipleArgs",
    script: {code: (function callbackIgnoreMultipleArgs(cb) {
      cb(1,2,3);
    }).toString()},
    result: {value: 1}
  },
  {name: "callbackBool",
    script: {code: (function callbackBool(cb) {
      cb(true);
    }).toString()},
    result: {value: true}
  },
  {name: "callbackString",
    script: {code: (function callbackString(cb) {
      cb("foobar");
    }).toString()},
    result: {value: "foobar"}
  },
  {name: "callbackArray",
    script: {code: (function callbackArray(cb) {
      cb([3,2,1]);
    }).toString()},
    result: {value: [3,2,1]}
  },
  {name: "callbackObject",
    script: {code: (function callbackObject(cb) {
      cb({foobar: "foobar"});
    }).toString()},
    result: {value: {foobar: "foobar"}}
  },
  {name: "consoleLogs",
    script: {code: (function consoleLogs(cb) {
      var baz = "baz";
      console.log("foo", "bar", baz);
      console.log("second log")
      cb();
    }).toString()},
    result: {console: ["foo bar baz", "second log"]}
  }
  // TODO: exceptions
  // TODO: timeouts
  // TODO: globals
  // TODO: callers
];

describe('runtime', function() {
  describe('#execute()', function() {
    execTests.forEach(function(test) {
      it(test.name, function(done) {
        var rpc = new duplex.RPC(duplex.JSON);
        var conn = ws.connect("ws://localhost:8000/", {}, () => {
          rpc.handshake(duplex.wrap["nodejs-websocket"](conn), (peer) => {
            // fill in structure we want/expect but leave out of tests
            // to keep them easier to read
            test.script.call = test.script.call || test.name;
            test.error = test.error || null;
            if (test.error == null) {
              test.result = test.result || {};
              test.result.console = test.result.console || [];
              test.result.value = test.result.value || null;
            }
            peer.call("runtime.execute", test.script, function(err, result) {
              if (result !== undefined) {
                delete result.time; // ignore time
              }
              assert.deepEqual({error: err, result: result}, {error: test.error, result: test.result});
              done();
            });
          });
        });
      });
    });
  });
});
