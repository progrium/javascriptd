#!/usr/bin/env node
var http = require('http');
var vm = require('vm');
var ws = require("nodejs-websocket");
var {duplex} = require("./duplex.js");

var port = process.env["PORT"] || "8000";
var secret = process.env["SECRET"];
var rpc = new duplex.RPC(duplex.JSON);

rpc.register("engine.execute", function(ch) {
  ch.onrecv = function(err, req) {
    var timeout;
    try {
      const sandbox = (req.globals || {});
      const logs = [];
      const defaultCaller = (callee, cb) => callee(cb)
      sandbox.script = req.script;
      sandbox.call = req.call;
      sandbox.require = require;
      sandbox.console = {
        log: function() {
          var args = Array.prototype.slice.call(arguments);
          logs.push(args.join(" "));
        }
      }
      vm.createContext(sandbox);
      console.log("request:", req.call);
      vm.runInContext(req.script, sandbox, {timeout: 1000});
      if (sandbox[req.call] === undefined) {
        ch.senderr(1001, "Not implemented")
        return
      }
      var timeout = setTimeout(function() {
        console.log("timeout:", req.call);
        ch.senderr(1002, "Timeout")
      }, 3000);
      vm.runInContext(req.caller || defaultCaller, sandbox, {timeout: 1000})(sandbox[req.call], function(res) {
        clearTimeout(timeout);
        console.log("returned:", req.call);
        ch.send({"result": res, "console": logs});
      });
    } catch (e) {
      var name;
      if (typeof e == "string") {
        name = e;
      } else {
        name = e.name;
      }
      if (timeout !== undefined) {
        clearTimeout(timeout);
      }
      console.log("exception:", req.call, name);
      ch.senderr(1003, name, e.stack);
    }
  }
})

ws.createServer(function (conn) {
  if (secret !== "") {
    if (conn.headers["x-engine-secret"] != secret) {
      conn.close();
    }
  }
  rpc.accept(duplex.wrap["nodejs-websocket"](conn))
}).listen(port);

console.log(`Serving engine on ${port}...`)
