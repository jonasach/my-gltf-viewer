const path = require('path');
const uuid = require('uuid');

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');

const passport = require('passport');
const OnshapeStrategy = require('passport-onshape');

const config = require('./config');

const app = express();

const axios = require('axios');

var child = require('child_process');
var fs = require('fs');

var httpserver = require('./httpserver.js');
var arenaapi = require('./arenaapi.js');


let arenaSessionId = '';
let guid = '';

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'dist')));
app.use(bodyParser.json());

app.set('trust proxy', 1); // To allow to run correctly behind Heroku

app.use(session({
    secret: config.sessionSecret,
    saveUninitialized: false,
    resave: false,
    cookie: {
        name: 'shielded-caverns-95967',
        sameSite: 'none',
        secure: true,
        httpOnly: true,
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new OnshapeStrategy({
        clientID: config.oauthClientId,
        clientSecret: config.oauthClientSecret,
        callbackURL: config.oauthCallbackUrl,
        authorizationURL: `${config.oauthUrl}/oauth/authorize`,
        tokenURL: `${config.oauthUrl}/oauth/token`,
        userProfileURL: `${config.oauthUrl}/api/users/sessioninfo`
    },
    (accessToken, refreshToken, profile, done) => {
        profile.accessToken = accessToken;
        profile.refreshToken = refreshToken;
        return done(null, profile);
    }
));
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

app.use(express.json()); // Parse JSON data
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded data


app.post('/getItemCategories', (req, res) => {
  apiUrl = (config.arenaapiurl)  + 'settings/items/categories'
  axios
      .get(apiUrl , {
        headers: {
          arena_session_id: arenaSessionId
        }
      })

    .then(response => {
      const responseData = JSON.stringify(response.data);
      res.send(responseData);
    })
    .catch(error => {
      res.status(500).json({ error: 'Internal Server Error' });
    });
});


app.post('/getCategoryAttributes', (req, res) => {

     for (const [key, value] of Object.entries(req.body)) {
        for (const innerKey in value) {
          switch (innerKey) {
            case 'guid':
              guid = value[innerKey];
              break;
            default:
              break;
          } 
      }
    }

  apiUrl = (config.arenaapiurl)  + 'settings/items/categories/' + guid + '/attributes?includePossibleValues=true'
  axios
      .get(apiUrl , {
        headers: {
          arena_session_id: arenaSessionId
        }
      })

    .then(response => {
      const responseData = JSON.stringify(response.data);
      res.send(responseData);
    })
    .catch(error => {
      res.status(500).json({ error: 'Internal Server Error' });
    });
});



app.post('/login', (req, res) => {

  for (const [key, value] of Object.entries(req.body)) {
    if (typeof value === 'object') {
      for (const innerKey in value) {
        switch (innerKey) {
          case 'email':
            email = value[innerKey];
            break;
          case 'password':
            password = value[innerKey];
            break;
          default:
            break;
        }
      }     
    }
  }

  apiUrl = (config.arenaapiurl) 
  workspaceId = (config.arenaapiworkspaceid)

// Make the login API call using the arenaapi module
  const args = {
    apiUrl: apiUrl,
    email: email,
    password: password,
    workspaceId: workspaceId
  };

  axios
    .post( apiUrl + 'login' , args)
    .then(response => {
      // Handle the API response here
      const responseData = response.data;

      arenaSessionId = responseData.arenaSessionId;
      console.log (arenaSessionId)

      res.json(responseData);


    })
    .catch(error => {
      // Handle errors
      console.error('An error occurred:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    });
});
  

app.post('/env', (req, res) => {
  const response = {
    message: 'env',
    data: req.body
  };
  res.send(response);
});


app.post('/setArenaAPIURL', (req, res) => {
  const response = {
    message: { result: true },
    data: req.body
  };
  res.send(response);
});


app.use('/oauthSignin', (req, res) => {
    const state = {
        docId: req.query.documentId,
        workId: req.query.workspaceId,
        elId: req.query.elementId
    };
    req.session.state = state;
    return passport.authenticate('onshape', { state: uuid.v4(state) })(req, res);
}, (req, res) => { /* redirected to Onshape for authentication */ });

app.use('/oauthRedirect', passport.authenticate('onshape', { failureRedirect: '/grantDenied' }), (req, res) => {
  res.redirect(`/?documentId=${req.session.state.docId}&workspaceId=${req.session.state.workId}&elementId=${req.session.state.elId}`);
});

app.get('/grantDenied', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'html', 'grantDenied.html'));
})

app.get('/', (req, res) => {
    if (!req.user) {
        return res.redirect(`/oauthSignin${req._parsedUrl.search}`);
    } else {
        return res.sendFile(path.join(__dirname, 'public', 'html', 'index.html'));
    }
});

app.use('/api', require('./api'));

module.exports = app;


var rpc = {};

rpc.GET = function(session, pathName, callbackGET) {
  console.log ('server.js:8888:GET');
  var answer = null;
  var match = /items\/([A-Z0-9]+)\/files\/([A-Z0-9]+)\/content/.exec(pathName);
  if (match) {
    arenaapi.getItemFileContent({guid: match[1], fileguid: match[2]}, function(statusCode, errors, result) {
      console.log ('server.js:8888:getItemFileContent');
      var ans = errors != null ? new Buffer(JSON.stringify({error: 'APIERROR', errorMessage: errors.errors[0].message}), 'utf8') : result;
      callbackGET(ans);
    });
  } else
    callbackGET(null);
};

rpc.env = function(session, params, callback) {
  console.log ('server.js:8888: env');
  callback({result: process.env});
};

rpc.setArenaAPIURL = function(session, params, callback) {
  console.log ('server.js:8888:setArenaAPIURL' );  
  arenaapi.url = params.url;
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



