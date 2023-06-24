var path = require('path');
var child = require('child_process');
var fs = require('fs');
var httpserver = require('./httpserver.js');
var arenaapi = require('./arenaapi.js');

var rpc = {};

rpc.GET = function(session, pathName, callbackGET) {
    var answer = null;
    var match = /items\/([A-Z0-9]+)\/files\/([A-Z0-9]+)\/content/.exec(pathName);
    if (match) {
        arenaapi.getItemFileContent({guid: match[1], fileguid: match[2]}, function(statusCode, errors, result) {
            //console.log ('line 17 get file content: inside server.js')
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
              console.log ('8888.35: options:key:' + key);
              options[key] = key == 'cwd' ? path.join(cwd, params.options[key]) : params.options[key];
          }
    }

    //need to switch to spawn and remove this maxBuffer hack......

    console.log ('8888.73: fileName:' + JSON.stringify(params.fileName));

    options['maxBuffer'] = 100000 * 1024

    child.execFile(params.fileName, params.args || [], options, function(error, stdout, stderr) {
        console.log ('8888.75: param.args:' + JSON.stringify(params.args));
        console.log ('8888.76:' + JSON.stringify(options) );
        console.log ('8888.77:' + JSON.stringify(error) );
        console.log ('8888.78:' + stderr.toString('utf8') )
        console.log ('8888.79:' + stdout.toString('utf8') )
      callback(error != null ? error.toString() : stdout.toString('utf8') + stderr.toString('utf8'));
              console.log ('8888.80:' + stdout.toString('utf8') )
    });
};

rpc.env = function(session, params, callback) {
    console.log ('8888.55: env:' + process.env);
    callback({result: process.env});
};

rpc.setArenaAPIURL = function(session, params, callback) {
    arenaapi.url = params.url;
    console.log ('8888: url:' + arenaapi.url)
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

        //console.log ('8888.101: ' + JSON.stringify(arenaapi.apis) )
httpserver.httpServer(config);
