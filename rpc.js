var path = require('path');
var child = require('child_process');
var fs = require('fs');
var httpserver = require('./httpserver.js');
var arenaapi = require('./arenaapi.js');

console.log ('server.js:8888.10');

var rpc = {};

rpc.GET = function(session, pathName, callbackGET) {
  console.log ('server.js:8888:GET');
  var answer = null;
  var match = /items\/([A-Z0-9]+)\/files\/([A-Z0-9]+)\/content/.exec(pathName);
  if (match) {
    arenaapi.getItemFileContent({guid: match[1], fileguid: match[2]}, function(statusCode, errors, result) {
      console.log ('server.js:8888:getItemFileContent');
      var ans = errors != null ? new Buffer(JSON.stringify({error: 'APIERROR', errorMessage: errors.errors[0].message}), 'utf8') : result;
      callbackGET(ans);
    });
  } else
    callbackGET(null);
};

rpc.env = function(session, params, callback) {
  console.log ('server.js:8888: env');
  callback({result: process.env});
};

rpc.setArenaAPIURL = function(session, params, callback) {
  console.log ('server.js:8888:setArenaAPIURL' );  
  arenaapi.url = params.url;
  callback({result: true});
};

arenaapi.apis.forEach(function(api) {
  if (api.method == 'POST') {
    rpc[api.name] = function(session, params, callback) {
      arenaapi[api.name](null, params, function(statusCode, errors, result) {
        callback(errors != null ? {error: 'APIERROR', errorMessage: errors.errors[0].message} : {result: result});
      });
    };
  } else {
    rpc[api.name] = function(session, params, callback) {
      arenaapi[api.name](params, function(statusCode, errors, result) {
        callback(errors != null ? {error: 'APIERROR', errorMessage: errors.errors[0].message} : {result: result});
      });
    };
  }
});

var cwd = path.join(path.dirname(require.main.filename), '..'); // samples base dir
var config = {log: 0, rpc: rpc, root: path.join(cwd, 'server/www'), port: 9876};
httpserver.httpServer(config);
