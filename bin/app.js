



const child = require('child_process');




const fs = require('fs');

const path = require('path');
const uuid = require('uuid');

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');

const passport = require('passport');
const OnshapeStrategy = require('passport-onshape');

const config = require('./config');

const app = express();

const httpserver = require('./httpserver.js');

const arenaapi = required('./arenaapi.js')


app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'dist')));
app.use(bodyParser.json());

app.set('trust proxy', 1); // To allow to run correctly behind Heroku

app.use(session({
    secret: config.sessionSecret,
    saveUninitialized: false,
    resave: false,
    cookie: {
        name: 'app-gltf-viewer',
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
