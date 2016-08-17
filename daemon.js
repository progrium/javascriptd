#!/usr/bin/env node
var http = require('http');
var vm = require('vm');
var crypto = require('crypto');
var util = require('util');

var ws = require("nodejs-websocket");
var {duplex} = require("./duplex.js");

var port = process.env["PORT"] || "8765";
var timeout = process.env["TIMEOUT"] || "3000";
var secret = process.env["SECRET"];

function log() {
  if (process.env["NOLOGS"] == "true") return;
  var args = Array.prototype.slice.call(arguments);
  args.unshift(Date.now());
  console.log(...args);
}

var rpc = new duplex.RPC(duplex.JSON);

rpc.register("runtime.execute", function(ch) {
  ch.onrecv = function(err, script) {
    var timeoutHandle;
    const logs = [];
    const hash = crypto
      .createHash('md5')
      .update(script.code)
      .digest("hex");
    try {
      const sandbox = (script.globals || {});
      const defaultCaller = (callee, cb) => callee(cb);

      sandbox._script = script.code;
      sandbox._call = script.call;
      sandbox.require = require;
      sandbox.console = {
        log: function() {
          var args = Array.prototype.slice.call(arguments);
          logs.push(args.join(" "));
        }
      }

      var startTime = Date.now();
      timeoutHandle = setTimeout(function() {
        log(hash, script.call, "Timeout");
        ch.senderr(1002, "Timeout")
      }, 3000);
      vm.createContext(sandbox);
      vm.runInContext(script.code, sandbox, {timeout: timeout});
      if (sandbox[script.call] === undefined) {
        clearTimeout(timeoutHandle);
        ch.senderr(1001, "Not implemented")
        return
      }
      var caller = vm.runInContext(script.caller || defaultCaller, sandbox, {timeout: timeout});
      caller(sandbox[script.call], function(value) {
        clearTimeout(timeoutHandle);
        var time = Date.now() - startTime;
        log(hash, script.call, time);
        ch.send({"value": value || null, "console": logs, "time": time});
      });
    } catch (e) {
      var name;
      if (typeof e == "string") {
        name = e;
      } else {
        name = e.name;
      }
      if (timeoutHandle !== undefined) {
        clearTimeout(timeoutHandle);
      }
      log(hash, script.call, name);
      ch.senderr(1000, name, {stack: e.stack, console: logs});
    }
  }
})

ws.createServer(function (conn) {
  if (secret !== "") {
    if (conn.headers["x-runtime-secret"] != secret) {
      conn.close();
    }
  }
  rpc.accept(duplex.wrap["nodejs-websocket"](conn))
}).listen(port);

console.log(`Serving engine on ${port}...`)
