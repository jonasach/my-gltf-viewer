var doItems = function() {

  var items = state.searchResults;

  var $subtitle = $('<div>').addClass('subtitle').text('Results for ' + state.search);
  var $table = $('<table><tbody>');
  $table.append($('<tr>').append($('<th>').text('Number'), $('<th>').text('Name'), $('<th>').text('Description'), $('<th>').text('Number of Files')));

  items.forEach(function(item) {
    var $number = $('<td>').addClass('nobreak');
    var $name = $('<td>').addClass('nobreak');
    var $description = $('<td>');
    var $fileCount = $('<td>');
    $table.append($('<tr>').append($number.text(item.number), $name.text(item.name), $description.text('<loading...>'), $fileCount.text('--')));

    ajaxCall(null, 'getItem', {guid: item.guid}).then(function(result) {
      console.log("getting the item")
      var description = result.result.description;
      $description.text(description);
    }, function(error) {
      $fileCount.text(JSON.stringify(error));
    });

    ajaxCall(null, 'getItemFiles', {guid: item.guid}).then(function(result) {
      var files = result.result.results
      $fileCount.text(files.length);
      if (files.length > 0) {
        var maybeGoFiles = function(event) {
          event.preventDefault();
          setState({context: 'files', item: item, files: files});
        };
        $number.empty().append($('<a href="#">').text(item.number)).on('click', maybeGoFiles);
        $name.empty().append($('<a href="#">').text(item.name)).on('click', maybeGoFiles);
      }
    }, function(error) {
      $fileCount.text(JSON.stringify(error));
    });

  });

  var $message = $('<div>').addClass('message').text('\u00a0');
  var $search = $('<input type="button" value="Back to Search">');
  var $logout = $('<input type="button" value="Logout">');
  $('#content').empty().append($subtitle, $table, $message, $logout, $search);

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
