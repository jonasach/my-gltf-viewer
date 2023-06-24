var ajaxCall = function(url, method, params, context) {
  url = url || document.URL;
  context = context || window;
  var deferred = $.Deferred();
  var xhr = new XMLHttpRequest();
  xhr.open('POST', url, true);
  xhr.timeout = 0;
  xhr.setRequestHeader('Content-Type', 'text/plain;charset=UTF-8');
  xhr.onload = function() {
    var response = xhr.responseText;
    try {
      var responseJV = JSON.parse(response);
      if (!responseJV.error) {
        deferred.resolveWith(context, [responseJV]);
      } else {
        deferred.rejectWith(context, [responseJV]);
      }
    } catch (e) {
      var s = e.message + ' ' + response ;
      deferred.rejectWith(context, [e.message + ' ' + response]);
    }
  };
  xhr.onerror = function(e) {
    deferred.rejectWith(context);
  };
  xhr.send(JSON.stringify({method: method, params: params}));
  deferred.promise(xhr);        // attach promise to xhr
  return xhr;                   // this is a promise too
};

jQuery(function($) {

  var env = {};

  ajaxCall(null, 'env', {}).then(function(result) {
    env = result.result;
    if ('ARENA_API_URL'      in env) $('#url')     .val(env.ARENA_API_URL);
    if ('ARENA_API_EMAIL'    in env) $('#email')   .val(env.ARENA_API_EMAIL);
    if ('ARENA_API_PASSWORD' in env) $('#password').val(env.ARENA_API_PASSWORD);
    if ('ARENA_API_WORKSPACEID' in env) $('#workspaceID').val(env.ARENA_API_WORKSPACEID);
    if ('ARENA_API_LOG'      in env) $('#log')     .prop('checked', '1TtYy'.indexOf(env.ARENA_API_LOG[0]) != -1);
  });

  $('.exec').on('click', function(event) {
    event.preventDefault();
    var nodeFile = $(this).data('file');
    var $sourceText = $('#source').find('textarea').val('');
    var $resultText = $('#result').find('textarea').val('');
    var isJava = nodeFile.indexOf('.java') != -1;
    var srcFile = isJava ? 'java/' + nodeFile : 'node/' + nodeFile;

    ajaxCall(null, 'fileRead', {fileName: srcFile}).then(function(result) {
      $sourceText.val(result.result);
      env.ARENA_API_URL = $('#url').val();
      env.ARENA_API_EMAIL = $('#email').val();
      env.ARENA_API_PASSWORD = $('#password').val();
      env.ARENA_API_WORKSPACEID = $('#workspaceID').val();
      env.ARENA_API_LOG = $('#log').prop('checked').toString();

      if (nodeFile.indexOf('java') == -1)
        args = [nodeFile];
      else
        args = ['-cp', '../classes', nodeFile.substring(0, nodeFile.indexOf('.'))];

      ajaxCall(null, 'execFile', {fileName: isJava ? 'java' : 'node', args: args, options: {env: env, timeout: 15000, cwd: isJava ? 'java' : 'node'}}).then(function(result) {
        $resultText.val(result);
      }, function(error) {
        $resultText.val(JSON.stringify(error));
      });
    }, function(error) {
      $sourceText.val(JSON.stringify(error));
    });
  });
});
