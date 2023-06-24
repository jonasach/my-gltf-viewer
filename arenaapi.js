var https = require('https');
var util = require('util');
var url = require('url');

// var  fetch1 = require('node-fetch');
exports.url = '';
exports.log = false;                            // no console log by default
exports.colorOutput = process.stdout.isTTY;     // color if not directed to file
exports.sessionID = null;                       // set at login, used for others, back to null at logut

process.traceDeprecation = false;

var showResult = function(info, statusCode, errors, result) {
  var inspectOptions = {depth: 4, colors: exports.colorOutput};
  if (errors != null) {
    var ansiRed  = exports.colorOutput ? ['\x1B[31m', '\x1B[39m'] : ['', ''];
   // console.log('->%s %d %s ERRORS%s\n%s', ansiRed[0], statusCode, info, ansiRed[1], util.inspect(errors, inspectOptions));
  } else {
    var ansiBlue = exports.colorOutput ? ['\x1B[34m', '\x1B[39m'] : ['', ''];
    console.log('->%s %d %s RESULT%s\n%s', ansiBlue[0], statusCode, info, ansiBlue[1], util.inspect(result, inspectOptions));
  }
};


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

// this is the entry point for the calls within the specific RESTAPI js files.
// example:   arenaapi.getFileContent({}, function(statusCode, errors, result) {
var apiCall = function(name, method, urlPart, args, body, callback) {
  //console.log( '<BR>.....20002  name 1: '  +  name )
  //console.log( '<BR>.....20002  urlPart 1: '  +  urlPart )
  //console.log( '<BR>.....20002  urlPart 1: '  +  urlPart )
  //console.log ('<BR>..... 20900.2: ' + JSON.stringify(exports.apis))

if (name=="getFileContent") {
  var selectedguid = process.env.ARENA_SELECTED_GUID;
  args[`guid`] = selectedguid
}

if (name=="getTrainingPlanUsers") {
  var selectedguid = process.env.ARENA_SELECTED_GUID;
  args[`guid`] = selectedguid
}


  var headers = {};
  if (args != null) {
    var query = [];     // these are the query parameters
    for (var key in args) {
      var k = urlPart.indexOf('`' + key + '`');
      if (k != -1) {
        urlPart = urlPart.substring(0, k) + encodeURIComponent(args[key]) + urlPart.substring(k + 2 + key.length);
      } else {
        query.push( encodeURIComponent(args[key]));
      }
    }
  }


  /* ___________________________________________________________________________*/
  var bodyBuffer = null;
     // REST body for POST calls
  if (body != null) {
    if (Buffer.isBuffer(body)) {
      bodyBuffer = body;
      headers['Content-Type'] = 'application/octet-stream';
    } else if (typeof body == 'string') {
      bodyBuffer = new Buffer.from(body, 'utf8');
      headers['Content-Type'] = 'text/plain';
    } else {
      bodyBuffer = new Buffer.from(JSON.stringify(body), 'utf8');
      headers['Content-Type'] = 'application/json';
    }
    headers['Content-Length'] = bodyBuffer.length;
  }


  /* ___________________________________________________________________________*/
  if (exports.sessionID != null)
    headers['Cookie'] = 'arena_session_id=' + exports.sessionID;

  var urlObj = url.parse(exports.url);

//  console.log( '<BR>.....20004 urlObj 2: '  +  exports.url  )


  var options = {
    hostname: urlObj.hostname,
    port: urlObj.port,
    path: urlObj.path + urlPart,
    method: method,
    headers: headers,
    rejectUnauthorized: false   // no SSL cert required
  };
  /* ___________________________________________________________________________*/

  //console.log( '<BR>.....20004.5 urlObj 2: '  +  exports.sessionID )
  //console.log( '<BR>.....20004.5 urlObj 2: '  +  method )
  //console.log( '<BR>.....20004.5 urlObj 2: '  +  headers )

  var req = https.request(options, function(res) {
    var buffers = [];

  //  console.log( '<BR>.....20005 ' + urlPart  )

    res.on('data', function(data) { buffers.push(data); });
    res.on('end', function()
    {

      var buffer = buffers.length == 0 ? null : Buffer.concat(buffers);
      var bufferJSON = null;

      /* alternative ways to get base64String
      ar base64String = btoa(res);
      var base64String = btoa(String.fromCharCode.apply(null, new Uint8Array(res)));
      */
      btoa([].reduce.call(new Uint8Array(buffer),function(p,c){return p+String.fromCharCode(c)},''))

      if (buffer != null && res.headers['content-type'].indexOf('application/json') != -1) { // node lowercases headers
        try {
          bufferJSON = JSON.parse(buffer.toString());
        } catch(e) {}
      }

      var errors = null;
      var result = null;

      /*      if its not json than it should be a file. set the result to the buffer binary array.*/
      if (buffer != null && res.statusCode >= 200 && res.statusCode < 300 && res.headers['content-type'].indexOf('application/json') != -1) {

          result = bufferJSON != null ? bufferJSON : buffer;

      //console.log ('<BR> 900: ');
      //console.log ('<BR> 900: ' + exports.sessionID);

          if ('set-cookie' in res.headers && result != null && typeof result == 'object' && 'arenaSessionId' in result)        // is a login
                exports.sessionID = result.arenaSessionId;
          } else if (buffer != null && res.statusCode >= 200 && res.statusCode < 300) {
               result = buffer;
          } else {
              errors = bufferJSON != null ? bufferJSON : {status: res.statusCode, errors: [{code: 9999, message: 'API RESPONSE ERROR', info: {method: method, url: options.path, args: args, headers: res.headers, result: buffer != null ? buffer.toString() : null}}]}; // format like API error
          };

         //console.log ('<BR> 901');


          if (exports.log)
            showResult(options.method + ' ' + options.path + ' ' + name, res.statusCode, errors, result);

      //console.log ('<BR> 902');

          if (errors == null && options.path.indexOf('/logout') != -1)
                    exports.sessionID = null;       // export so api callers can test if session is valid (may have expired though)


        //console.log ('<BR> 903:' + JSON.stringify(result) );

          callback(res.statusCode, errors, result);
      });

      //console.log ('end of call')
  });


  req.on('error', function(e) {
    var errors = {status: 0, errors: [{code: 9998, message: 'API REQUEST ERROR: ' + e.message, info: {method: method, url: options.path, args: args}}]}; // format like API error
  });
//;

  if (bodyBuffer != null)
    req.write(bodyBuffer);
  req.end();

  };

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
  {name: 'getItemThumbnail',      method: 'GET',    urlPart: 'items/ZH1KPF0DP6PXGVLRQT3Q/image/content'},
  {name: 'getItems',              method: 'GET',    urlPart: 'items?limit=100&offset=10&criteria=%5B%5B%7B%22attribute%22%3A%22number%22%2C%22operator%22%3A%22STARTS_WITH%22%2C%22value%22%3A%22900%22%7D%5D%5D'},
  {name: 'getItem',               method: 'GET',    urlPart: 'items/<guid>'},
  {name: 'getItemSpec',           method: 'GET',    urlPart: 'items/VDXGLBW9L2LTCQJZCUPS?includeEmptyAdditionalAttributes=true'},
  {name: 'getItemsinproduction',  method: 'GET',    urlPart: 'items?limit=80&offset=50&lifecyclePhase.guid=XFZINDYBN4MP8RATAGUX'},
  {name: 'getItemAttributes',     method: 'GET',    urlPart: 'settings/items/categories/HZJ27XIV7O7H0JV2BV7S/attributes?includePossibleValues=true'},
  {name: 'getItemCategories',     method: 'GET',    urlPart: 'settings/items/categories?assignable=true'},
  {name: 'getItemContent1',       method: 'GET',    urlPart: 'files'},


  // file world actions
  {name: 'getFiles',              method: 'GET',    urlPart: 'files?limit=100&offset=10'},
  {name: 'getFilePDFs',           method: 'GET',    urlPart: 'files?limit=100&format=pdf'},
  {name: 'getFileSummary',        method: 'GET',    urlPart: 'files/7P9SXN8LXEXDWF437QUU'},
  {name: 'getFileContent',        method: 'GET',    urlPart: 'files/`guid`/content'},


  // Training Plan EndPoints
  {name: 'getTrainingPlans',      method: 'GET',    urlPart: 'trainingplans'},
  {name: 'getTrainingPlanUsers',  method: 'GET',    urlPart: 'trainingplans/`guid`/users'},
  // change the hardcodedd GUID back into `guid`
  {name: 'getTrainingPlanItems',  method: 'GET',    urlPart: 'trainingplans/6O8RWM7KWDUFYH0J2L4J/items'},
  {name: 'getTrainingPlanFiles',  method: 'GET',    urlPart: 'trainingplans/6O8RWM7KWDUFYH0J2L4J/files'},


  {name: 'getSuppliers',          method: 'GET',    urlPart: 'suppliers?limit=30&offset=10'},
  {name: 'updateItem',            method: 'PUT',    urlPart: 'items/<guid>'},
  {name: 'getQualityTemplate',    method: 'GET',    urlPart: 'settings/qualityprocesses/templates'},
  {name: 'getQualityTemplates',   method: 'GET',    urlPart: 'settings/qualityprocesses/templates'},
  {name: 'getQuality',            method: 'GET',    urlPart: 'qualityprocesses?limit=80&offset=5'},
  {name: 'getQualityEventObject', method: 'GET',    urlPart: 'qualityprocesses/TBVEJ9U7J0JFYH0D3ALV'},
  {name: 'createQuality',         method: 'POST',   urlPart: 'qualityprocesses'},

  {name: 'createItem',            method: 'POST',   urlPart: 'items'},
  {name: 'getChangeCategories',   method: 'GET',    urlPart: 'settings/changes/categories'},
  {name: 'getChanges',            method: 'GET',    urlPart: 'changes?limit=80&offset=50'},
  {name: 'deleteItem',            method: 'DELETE', urlPart: 'items/<guid>'},
  {name: 'getItemBOM',            method: 'GET',    urlPart: 'items/<guid>/bom'},
  {name: 'getItemFiles',          method: 'GET',    urlPart: 'items/<guid>/files'},
  {name: 'getItemFileContent',    method: 'GET',    urlPart: 'items/<guid>/files/<fileguid>/content'},
  {name: 'addItemFile',           method: 'POST',   urlPart: 'items/<guid>/files'},
  {name: 'addItemFileContent',    method: 'POST',   urlPart: 'items/<guid>/files/<fileguid>/content'},
  {name: 'deleteItemFile',        method: 'DELETE', urlPart: 'items/<guid>/files/<fileguid>'},
  {name: 'getEventTriggers',      method: 'GET',    urlPart: 'settings/integrations/triggers'},
  {name: 'getEventIntegrations',  method: 'GET',    urlPart: 'outboundevents'},
  {name: 'getUnreconciledEvents',  method: 'GET',   urlPart: 'outboundevents/UCWFKAV8K1CATCVEXIDT/events'},
  {name: 'getUnreconciledEventObjects',  method: 'GET',   urlPart: 'outboundevents/UCWFKAV8K1CATCVEXIDT/events/6O8RWM7KWDOO7Q9SBTXF/qualityprocesses'}
];

exports.apis.forEach(function(api) {
  if (api.method == 'POST' || api.method == 'PUT') {
    exports[api.name] = function(args, body, callback) { apiCall(api.name, api.method, api.urlPart, args, body, callback); };
  //  console.log ('<BR> 99999.1:' + api.urlPart)
  }
  else {
    exports[api.name] = function(args, callback) { apiCall(api.name, api.method, api.urlPart, args, null, callback); };
  //  console.log ('<BR> 99999.2:' + api.urlPart)
}

});
