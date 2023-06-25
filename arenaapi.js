var https = require('https');
var util = require('util');
var url = require('url');

exports.url = '';
exports.log = false;                            // no console log by default
exports.colorOutput = process.stdout.isTTY;     // color if not directed to file
exports.sessionID = null;                       // set at login, used for others, back to null at logut

var showResult = function(info, statusCode, errors, result) {
  var inspectOptions = {depth: 4, colors: exports.colorOutput};
  if (errors != null) {
    var ansiRed  = exports.colorOutput ? ['\x1B[31m', '\x1B[39m'] : ['', ''];
    console.log('->%s %d %s ERRORS%s\n%s', ansiRed[0], statusCode, info, ansiRed[1], util.inspect(errors, inspectOptions));
  } else {
    var ansiBlue = exports.colorOutput ? ['\x1B[34m', '\x1B[39m'] : ['', ''];
    console.log('->%s %d %s RESULT%s\n%s', ansiBlue[0], statusCode, info, ansiBlue[1], util.inspect(result, inspectOptions));
  }
};
console.log ('          arenaapi.js:9999:20');

// apiCall is a function which takes the specifics of the particular API, builds the REST call, executes it, and calls the callback when complete
// name:     string api name for logging
// method:   string HTTP method: GET, POST, ...
// urlPart:  string Trailing part of REST url, depends on API call, <ARG> will be replaced by args.ARG
// args:     map    Arguments as nam / value pairs which will be inserted into the URL as part of the path or query arguments (may be null)
// body:     Buffer, string, or map Used for POST calls only as the POST data (may be null)
// callback: function(statusCode, errors, result) called when the API call is complete
//             statusCode is the integer HTTP status code
//             errors is the map (JSON object) returned from the API call
//             result is the map (JSON object) or Buffer returned from the API call

var apiCall = function(name, method, urlPart, args, body, callback) {
  console.log ('          arenaapi.js:9999:apiCall:' +  name + ":" + method  );
  var headers = {};
  if (args != null) {
    var query = [];     // these are the query parameters
    for (var key in args) {
      var k = urlPart.indexOf('<' + key + '>');
      if (k != -1)
        urlPart = urlPart.substring(0, k) + encodeURIComponent(args[key]) + urlPart.substring(k + 2 + key.length);
      else
        query.push(key + '=' + encodeURIComponent(args[key]));
    }
    if (query.length > 0)
      urlPart += '?' + query.join('&');
  }


  var bodyBuffer = null;        // REST body for POST calls
  if (body != null) {
    if (Buffer.isBuffer(body)) {
      bodyBuffer = body;
      headers['Content-Type'] = 'application/octet-stream';
    } else if (typeof body == 'string') {
      bodyBuffer = new Buffer(body, 'utf8');
      headers['Content-Type'] = 'text/plain';
    } else {
      bodyBuffer = new Buffer(JSON.stringify(body), 'utf8');
      headers['Content-Type'] = 'application/json';
    }
    headers['Content-Length'] = bodyBuffer.length;
  }

  console.log ('          arenaapi.js:9999:apiCall:64');

  if (exports.sessionID != null)
    headers['Cookie'] = 'arena_session_id=' + exports.sessionID;        //needed for all but a login

  var urlObj = url.parse(exports.url);

  var options = {
    hostname: urlObj.hostname,
    port: urlObj.port,
    path: urlObj.path + urlPart,
    method: method,
    headers: headers,
    rejectUnauthorized: false   // no SSL cert required
  };

  console.log ('          arenaapi.js:9999:76');

  var req = https.request(options, function(res) {
    console.log ('          arenaapi.js:9999:83');
    var buffers = [];
    res.on('data', function(data) { buffers.push(data); });
    res.on('end', function() {
      var buffer = buffers.length == 0 ? null : Buffer.concat(buffers);
      var bufferJSON = null;
      if (buffer != null && res.headers['content-type'].indexOf('application/json') != -1) { // node lowercases headers
        try {
          bufferJSON = JSON.parse(buffer.toString());
        } catch(e) {}
      }
      var errors = null;
      var result = null;
      if (res.statusCode >= 200 && res.statusCode < 300) {
        result = bufferJSON != null ? bufferJSON : buffer;
        if ('set-cookie' in res.headers && result != null && typeof result == 'object' && 'arenaSessionId' in result)        // is a login
          exports.sessionID = result.arenaSessionId;
      } else {
        errors = bufferJSON != null ? bufferJSON : {status: res.statusCode, errors: [{code: 9999, message: 'API RESPONSE ERROR', info: {method: method, url: options.path, args: args, headers: res.headers, result: buffer != null ? buffer.toString() : null}}]}; // format like API error
      }

      console.log ('          arenaapi.js:9999:99');
      if (exports.log)
        showResult(options.method + ' ' + options.path + ' ' + name, res.statusCode, errors, result);
      if (errors == null && options.path.indexOf('/logout') != -1)
        exports.sessionID = null;       // export so api callers can test if session is valid (may have expired though)
      callback(res.statusCode, errors, result);
    });
  });

  req.on('error', function(e) {
    var errors = {status: 0, errors: [{code: 9998, message: 'API REQUEST ERROR: ' + e.message, info: {method: method, url: options.path, args: args}}]}; // format like API error
    if (exports.log)
      showResult(options.method + ' ' + options.path + ' ' + name, 0, errors, null);
    callback(0, errors, null);
  });

  if (bodyBuffer != null)
    req.write(bodyBuffer);
  req.end();

  if (exports.log)
    console.log('--------------------------------------------\n%s %s\nheaders: %j\nbody: %s', options.method, options.path, options.headers, bodyBuffer);
};

console.log ('          arenaapi.js:9999:127');

exports.apis = [
  {name: 'login',                 method: 'POST',   urlPart: 'login'},
  {name: 'logout',                method: 'GET',    urlPart: 'logout'},
  {name: 'getItemNumberFormats',  method: 'GET',    urlPart: 'item/numberformats'},
  {name: 'getItemCategories',     method: 'GET',    urlPart: 'item/categories'},
  {name: 'getFileCategories',     method: 'GET',    urlPart: 'file/categories'},
  {name: 'getItemAttributes',     method: 'GET',    urlPart: 'item/attributes'},
  {name: 'getItemNumberFormat',   method: 'GET',    urlPart: 'item/numberformats/<guid>'},
  {name: 'getItemRevisions',      method: 'GET',    urlPart: 'items/<guid>/revisions'},
  {name: 'getItemRequirements',   method: 'GET',    urlPart: 'items/<guid>/requirements'},
  {name: 'getItemRelationships',  method: 'GET',    urlPart: 'items/<guid>/relationships'},
  {name: 'getCategoryAttributes', method: 'GET',    urlPart: 'item/categories/<guid>/attributes'},
  {name: 'getItems',              method: 'GET',    urlPart: 'items'},
  {name: 'getItem',               method: 'GET',    urlPart: 'items/<guid>'},
  {name: 'updateItem',            method: 'PUT',    urlPart: 'items/<guid>'},
  {name: 'createItem',            method: 'POST',   urlPart: 'items'},
  {name: 'deleteItem',            method: 'DELETE', urlPart: 'items/<guid>'},
  {name: 'getItemBOM',            method: 'GET',    urlPart: 'items/<guid>/bom'},
  {name: 'getItemFiles',          method: 'GET',    urlPart: 'items/<guid>/files'},
  {name: 'getItemFileContent',    method: 'GET',    urlPart: 'items/<guid>/files/<fileguid>/content'},
  {name: 'addItemFile',           method: 'POST',   urlPart: 'items/<guid>/files'},
  {name: 'addItemFileContent',    method: 'POST',   urlPart: 'items/<guid>/files/<fileguid>/content'},
  {name: 'deleteItemFile',        method: 'DELETE', urlPart: 'items/<guid>/files/<fileguid>'}
];

exports.apis.forEach(function(api) {
  console.log ('          arenaapi.js:9999:start the loop');
  if (api.method == 'POST' || api.method == 'PUT')
    exports[api.name] = function(args, body, callback) { apiCall(api.name, api.method, api.urlPart, args, body, callback); };
  else
    exports[api.name] = function(args, callback) { apiCall(api.name, api.method, api.urlPart, args, null, callback); };
});
