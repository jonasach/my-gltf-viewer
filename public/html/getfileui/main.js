var ajaxCall = function(url, method, params, context) {
  url = url || document.URL;


  
  url = "https://shielded-caverns-95967-5b91b982a51c.herokuapp.com/" + method
/*
  console.log(context)
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
*/


var xhr = new XMLHttpRequest();
xhr.open('POST', url, true);
xhr.timeout = 0;
xhr.setRequestHeader('Content-Type', 'application/json'); // Set the content type to JSON
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
    var s = e.message + ' ' + response;
    deferred.rejectWith(context, [e.message + ' ' + response]);
  }
};
xhr.onerror = function(e) {
  deferred.rejectWith(context);
};

// Prepare the request payload
var payload = {
  method: method,
  params: params
};

xhr.send(JSON.stringify(payload));
deferred.promise(xhr); // attach promise to xhr
return xhr; // this is a promise too
























var state = {};

var setState = function(s) {
  state = $.extend(state, s);
  if (window.history && window.history.replaceState)
    window.history.replaceState(state, '', '');
  switch (state.context) {
    case 'login':       doLogin();      break;
    case 'search':      doSearch();     break;
    case 'items':       doItems();      break;
    case 'files':       doFiles();      break;
  }
};

$(window).on('popstate', function(event) {
  setState(window.history.state);
});

jQuery(function($) {
  $('body').append($('<div>').addClass('title').text('Arena File Access'), $('<div id="content">'));
  setState(window.history && window.history.state ? window.history.state : {context: 'login'});
});
