var http = require('http');
var url  = require('url');
var path = require('path');
var fs   = require('fs');

var log;
var rpc;
var root;
var port;

var contentTypes = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'text/javascript',
  '.ico':  'image/ico'
};

var respondHTTPError = function(response, num, msg) {
  response.writeHead(num, {'Content-Type': 'text/plain'});
  response.write(msg + '\n');
  response.end();
};

var handleGet = function(session, headers, pathName, response) {
  var filename = path.join(root, pathName);
  fs.exists(filename, function(exists) {
    if(exists) {
      fs.stat(filename, function(err, stats) {
        if (err) {
          respondHTTPError(response, 500, err);
        } else {
          if (stats.isDirectory()) {
            handleGet(session, headers, pathName + '/index.html', response);
          } else {
            var hdrs = {'Last-Modified': stats.mtime.toUTCString()};
            var eTag ='"' + stats.mtime.getTime() + '-' + stats.size + '"';
            if (eTag == headers['if-none-match']) {
              response.writeHead(304, hdrs);
              response.end();
            } else {
              fs.readFile(filename, 'binary', function(err, file) {
                if (err) {
                  respondHTTPError(response, 500, err);
                } else {
                  var contentType = contentTypes[path.extname(filename)];
                  if (contentType !== undefined)
                    hdrs['Content-Type'] = contentType;
                  hdrs['Content-Length'] = stats.size;
                  hdrs['ETag'] = eTag;

                  response.writeHead(200, hdrs);
                  response.end(file, 'binary');
                }
              });
            }
          }
        }
      });
    } else {
      if ('GET' in rpc) {
        rpc.GET(session, pathName, function(result) {
          if (result != null) {
            response.writeHead(200, {'Content-Length': result.length, 'Set-Cookie': 'sid=' + session.sid});
            response.end(result);     // buffer
          } else {
            respondHTTPError(response, 404, '404 Not found');
          }
        });
      } else
        respondHTTPError(response, 404, '404 Not found');
    }
  });
};

var handlePost = function(session, body, response) {
  try {
    if (log > 0) console.log('POST: ' + body);
    if (log > 1) console.log('  session: ' + JSON.stringify(session));
    var call = JSON.parse(body);
    var method = rpc[call.method];
    var hdrs = {'Content-Type': 'application/json', 'Set-Cookie': 'sid=' + session.sid,};
    try {
      if (method === undefined)
        throw {error: 'BADMETHOD', errorMessage: call.method};
      method(session, call.params, function(result) {
        response.writeHead(200, hdrs);
        response.write(JSON.stringify(result));
        response.end();
      });
    } catch (e) {
      response.writeHead(200, hdrs);
      response.write(JSON.stringify(e));
      response.end();
    }
  } catch(err) {
    if (log > 0) console.log(err);
    respondHTTPError(response, 500, body);
  }
};

var server;
var timerID;

exports.httpServer = function(config) {
  log = config.log || 0;
  rpc = config.rpc || {};
  root = config.root || '.';
  port = config.port || 9090;
  server = http.createServer(function(request, response) {
    if (request.method == 'POST') {
      var body = '';
      request.on('data', function(data) {
        body += data;
      }).on('end', function() {
        handlePost(getOrCreateSession(request), body, response);
      });
    } else {
      var pathName = url.parse(request.url).pathname;
      handleGet(getOrCreateSession(request), request.headers, pathName, response);
    }
  }).listen(port);
  timerID = setInterval(function() {
    var now = Date.now();
    for (var sid in sessions) {
      if (sessions[sid]['lastAccess'] < now - sessionExpireTimeMS) {
        if (log > 0) console.log('purge session: ' + JSON.stringify(sessions[sid]));
        delete sessions[sid];
      }
    }
  }, sessionPurgeTimeMS);

};

exports.close = function(callback) {
  clearInterval(timerID);
  var callbackTimerID = setTimeout(callback, 100);   // http keep-alive might not close so we'll run callback for sure
  server.close(function() {
    clearTimeout(callbackTimerID);
    callback();
  });
};

var sessionPurgeTimeMS  = 10 * 60 * 1000; // 10 minutes
var sessionExpireTimeMS = 60 * 60 * 1000; // 60 minutes
var sessions = {};

var getOrCreateSession = function(request) {
  var sid = null;
  if (request.headers.cookie) {
    var match = /sid=([0-9]+)/.exec(request.headers.cookie);
    if (match !== null)
      sid = match[1];
  }
  if (sid === null) {
    sid = Math.random().toString();
    sid = sid.substring(sid.indexOf('.') + 1);
  }
  if (!(sid in sessions))
    sessions[sid] = {sid: sid, isNew: true, loggedIn: false};
  else
    sessions[sid]['isNew'] = false;

  sessions[sid]['lastAccess'] = Date.now();
  return sessions[sid];
};
