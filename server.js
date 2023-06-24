var path = require('path');
var child = require('child_process');
var fs = require('fs');
var httpserver = require('./httpserver.js');
var arenaapi = require('../node/arenaapi.js');

var rpc = {};

rpc.GET = function(session, pathName, callbackGET) {
  var answer = null;
  var match = /items\/([A-Z0-9]+)\/files\/([A-Z0-9]+)\/content/.exec(pathName);
  if (match) {
    arenaapi.getItemFileContent({guid: match[1], fileguid: match[2]}, function(statusCode, errors, result) {
      var ans = errors != null ? new Buffer(JSON.stringify({error: 'APIERROR', errorMessage: errors.errors[0].message}), 'utf8') : result;
      callbackGET(ans);
    });
  } else
    callbackGET(null);
};

rpc.fileRead = function(session, params, callback) {
  fs.readFile(path.join(cwd, params.fileName), 'utf8', function(err, data) {
    callback(err ? {error: 'FILEREADERROR', errorMessage: err.toString()} :  {result: data});
  });
};

rpc.execFile = function(session, params, callback) {
  var options = {};
  if ('options' in params) {
    for (var key in params.options) {
      options[key] = key == 'cwd' ? path.join(cwd, params.options[key]) : params.options[key];
    }
  }
  child.execFile(params.fileName, params.args || [], options, function(error, stdout, stderr) {
    callback(error != null ? error.toString() : stdout.toString('utf8') + stderr.toString('utf8'));
  });
};

rpc.env = function(session, params, callback) {
  callback({result: process.env});
};

rpc.setArenaAPIURL = function(session, params, callback) {
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

if ('ARENA_API_LOG' in process.env && '1TtYy'.indexOf(process.env.ARENA_API_LOG[0]) != -1)
  arenaapi.log = true;

var cwd = path.join(path.dirname(require.main.filename), '..'); // samples base dir
var config = {log: 0, rpc: rpc, root: path.join(cwd, 'server/www'), port: 9876};
httpserver.httpServer(config);
