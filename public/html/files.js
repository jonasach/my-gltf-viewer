var doFiles = function() {

  var item = state.item;
  var files = state.files;

  var $subtitle = $('<div>').addClass('subtitle').text('Files for ' + state.search);
  var $table = $('<table><tbody>');
  $table.append($('<tr>').append($('<th>').text('Title'), $('<th>').text('Edition'), $('<th>').text('Name')));

  files.forEach(function(file) {
    var $a = $('<a>').attr('href', '/items/' + item.guid + '/files/' + file.guid + '/content').text(file.file.title);
    $table.append($('<tr>').append($('<td>').append($a), $('<td>').text(file.file.edition), $('<td>').text(file.file.name)));
  });

  var $message = $('<div>').addClass('message').text('\u00a0');
  var $items = $('<input type="button" value="Back to Items">');
  var $search = $('<input type="button" value="Back to Search">');
  var $logout = $('<input type="button" value="Logout">');
  $('#content').empty().append($subtitle, $table, $message, $logout, $search, $items);

  $items.on('click', function() {
    setState({context: 'items'});
  });

  $search.on('click', function() {
    setState({context: 'search'});
  });

  $logout.on('click', function() {
    $message.text('Logging out...');
    var xhr = ajaxCall(null, 'logout', {});
    xhr.always(function() {
      setState({context: 'login'});
    });
  });
};
