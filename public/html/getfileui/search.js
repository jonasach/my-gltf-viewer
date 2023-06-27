var doSearch = function() {

  var blanks = function(n) { return Array(n + 1).join('\u00a0'); };

  var $categories = $('<select>').addClass('itemcat').append($('<option>').text(blanks(20)));
  var $table = $('<table><tbody>');
  var $attr1 = $('<select>').append($('<option>').text(blanks(20)));
  var $value1 = $('<input type="text">');
  $table.append($('<tr>').append($('<td>').text('Attribute:'), $('<td>').append($attr1), $('<td>').text('Value:'), $('<td>').append($value1)));
  var $attr2 = $('<select>').append($('<option>').text(blanks(20)));
  var $value2 = $('<input type="text">');
  $table.append($('<tr>').append($('<td>').text('Attribute:'), $('<td>').append($attr2), $('<td>').text('Value:'), $('<td>').append($value2)));
  var $attr3 = $('<select>').append($('<option>').text(blanks(20)));
  var $value3 = $('<input type="text">');
  $table.append($('<tr>').append($('<td>').text('Attribute:'), $('<td>').append($attr3), $('<td>').text('Value:'), $('<td>').append($value3)));

  var $message = $('<div>').addClass('message').text('\u00a0');
  var $search = $('<input type="button" value="Search">');
  var $logout = $('<input type="button" value="Logout">');
  $('#content').empty().append($('<span>').addClass('itemcat').text('Item Categories:'), $categories, $table, $message, $logout, $search);

  $message.text('Retrieving Item Categories...');
  var xhr = ajaxCall(null, 'getItemCategories', {});
  xhr.then(function(result) {
    $message.text('\u00a0');
    $categories.empty();
    var categoryValues = result.results;
    categoryValues.forEach(function(categoryValue) {
      $categories.append($('<option>').attr('value', categoryValue.guid).text(categoryValue.name));
    });
    $categories.val(state.category || categoryValues[0].guid);
    onChangeCategory();
  }, function(error) {
    $message.text(JSON.stringify(error));
  });

  var dropValues = {};

  var onChangeCategory = function() {
    $message.text('Retrieving Atrributes for selected Category...');
    var xhr = ajaxCall(null, 'getCategoryAttributes', {guid: $categories.val(), searchableOnly: true, includePossibleValues: true});
    xhr.then(function(result) {
      $message.text('\u00a0');
      $attr1.empty().append($('<option>').text(blanks(20)));
      $attr2.empty().append($('<option>').text(blanks(20)));
      $attr3.empty().append($('<option>').text(blanks(20)));
      var attributeValues = result.results;
      attributeValues.forEach(function(attributeValue) {
        $attr1.append($('<option>').attr('value', attributeValue.name).text(attributeValue.name));
        $attr2.append($('<option>').attr('value', attributeValue.name).text(attributeValue.name));
        $attr3.append($('<option>').attr('value', attributeValue.name).text(attributeValue.name));


        dropValues[attributeValue.name] = attributeValue.possibleValues;
      });
      $attr1.val(state.attr1 || '');
      $value1.val(state.value1 || '');
      $attr2.val(state.attr2 || '');
      $value2.val(state.value2 || '');
      $attr3.val(state.attr3 || '');
      $value3.val(state.value3 || '');
    }, function(error) {
      $message.text(JSON.stringify(error));
    });
  };

  $categories.on('change', onChangeCategory);

  var makeWidget = function($value, dropValues) {
    var $s;
    if (dropValues) {
      $s = $('<select>');
      dropValues.forEach(function(value) {
        $s.append($('<option>').attr('value', value).text(value));
      });
    } else {
      $s = $('<input type="text">');
    }
    $value.replaceWith($s);
    return $s;
  };

  $attr1.on('change', function(e) { $value1 = makeWidget($value1, dropValues[$attr1.val()]); });
  $attr2.on('change', function(e) { $value2 = makeWidget($value2, dropValues[$attr2.val()]); });
  $attr3.on('change', function(e) { $value3 = makeWidget($value3, dropValues[$attr3.val()]); });

  $search.on('click', function() {
    $message.text('Searching...');
    state.category = $categories.val();
    state.search = 'Category = ' + $categories.find('option:selected').text();
    state.attr1 = $attr1.val();
    state.value1 = $.trim($value1.val());
    state.attr2 = $attr2.val();
    state.value2 = $.trim($value2.val());
    state.attr3 = $attr3.val();
    state.value3 = $.trim($value3.val());
    var params = {'category.guid': state.category};
    if (state.value1.length > 0) {
      params[state.attr1] = state.value1;
      state.search += ' and ' + state.attr1 + ' = ' + state.value1;
    }
    if (state.value2.length > 0) {
      params[state.attr2] = state.value2;
      state.search += ' and ' + state.attr2 + ' = ' + state.value2;
    }
    if (state.value3.length > 0) {
      params[state.attr3] = state.value3;
      state.search += ' and ' + state.attr3 + ' = ' + state.value3;
    }
    params.limit = 200;
    var xhr = ajaxCall(null, 'getItems', params);
    xhr.then(function(result) {
      setState({context: 'items', searchResults: result.result.results});
    }, function(error) {
      $message.text(JSON.stringify(error));
    });
  });

  $logout.on('click', function() {
    $message.text('Logging out...');
    var xhr = ajaxCall(null, 'logout', {});
    xhr.always(function() {
      setState({context: 'login'});
    });
  });
};
