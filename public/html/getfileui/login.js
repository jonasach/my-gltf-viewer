var doLogin = function() {
  var $table = $('<table><tbody>');
  var $url = $('<input type="text">').val('');
  var $email = $('<input type="text">');
  var $password = $('<input type="password">');
  var $workspaceID = $('<input type="text">');
  $table.append($('<tr>').append($('<td>').text('API URL:'), $('<td>').append($url.attr('value', state.url))));
  $table.append($('<tr>').append($('<td>').text('Email:'), $('<td>').append($email.attr('value', state.email))));
  $table.append($('<tr>').append($('<td>').text('Password:'), $('<td>').append($password.attr('value', state.password))));
  $table.append($('<tr>').append($('<td>').text('Workspace ID:'), $('<td>').append($workspaceID.attr('value', state.workspaceID))));
  var $login = $('<input type="button" value="Login">');
  var $message = $('<div>').addClass('message').text('\u00a0');
  $('#content').empty().append($table, $message, $login);
  $login.on('click', function() {
    $message.text('Logging in...');

    ajaxCall(null, 'setArenaAPIURL', {url: $url.val()}).then(function() {
      var args = {email: $email.val(), password: $password.val()};
      var workspaceID = $.trim($workspaceID.val());
      if (workspaceID)
        args.workspaceId = workspaceID;
      ajaxCall(null, 'login', args).then(function(result) {
        setState({context: 'search', email: $email.val(), password: $password.val(), workspaceID: $workspaceID.val()});
      }, function(error) {
        $message.text(JSON.stringify(error));
      });
    }, function(error) {
      $message.text(JSON.stringify(error));
    });

  });

  ajaxCall(null, 'env', {}).then(function(result) { // fill in defaults if defined in environment
    var env = result.result;
    if ('ARENA_API_URL'      in env) $url.val(env.ARENA_API_URL);
    if ('ARENA_API_EMAIL'    in env) $email.val(env.ARENA_API_EMAIL);
    if ('ARENA_API_PASSWORD' in env) $password.val(env.ARENA_API_PASSWORD);
    if ('ARENA_API_WORKSPACEID' in env) $workspaceID.val(env.ARENA_API_WORKSPACEID);
  });

};
