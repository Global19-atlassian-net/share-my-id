var bodyParser = require('body-parser');
var GoogleSpreadsheet = require('google-spreadsheet');
var express = require('express'), 
  // load config from file
  config = require('./helpers/config'),
  httpLogging = require('./helpers/http-logging'),
  querystring = require("querystring"),
  fs = require('fs'),
  https = require('https'),
  session = require('express-session'),
  request = require('request');

var ssl_options = {
  key: fs.readFileSync('./helpers/sample_server.key'),
  cert: fs.readFileSync('./helpers/sample_server.cert'),
};

// Custom console for orcid logging
var orcidOutput = fs.createWriteStream('./log/orcidout.log');
var orcidErrorOutput = fs.createWriteStream('./log/orciderr.log');
var orcidLogger = new console.Console(orcidOutput, orcidErrorOutput);

// Init express
var app = express();
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());
app.use(session({  
    secret: "notagoodsecretnoreallydontusethisone",  
    resave: false,
    saveUninitialized: true,
    cookie: {httpOnly: true, secure: true},  
}));
secureServer = https.createServer(ssl_options, app);
secureServer.listen(config.PORT, config.SERVER_IP, function () { // Start express
  console.log('server started on ' + config.PORT);
});

app.get('/', function(req, res) { // Index page 
  req.session.share_info = false;
  // link we send user to authorize our requested scopes
  var auth_link = config.AUTHORIZE_URI + '?'
   + querystring.stringify({
    'redirect_uri': config.REDIRECT_URI,
    'scope': '/authenticate /activities/update',
    'response_type':'code',
    'client_id': config.CLIENT_ID
  });
  // reset any session on reload of '/'
  req.session.regenerate(function(err) {
      // nothing to do
  });
  res.render('pages/index', {'authorization_uri': auth_link});
});

app.post('/share-info', function(req, res) {
  req.session.share_info = req.body.share_info;
  console.log("Share info checked: " + req.session.share_info);
  req.session.save(function(err) {
  // session saved - nothing else to do
  });
});

app.get('/orcid-id.json', function(req, res) {
  res.json({'orcid_id': req.session.orcid_id});
});

app.get('/redirect-uri', function(req, res) { // Redeem code URL
  if (req.query.error == 'access_denied') {
    // User denied access
    var auth_link = config.AUTHORIZE_URI + '?'
   + querystring.stringify({
      'redirect_uri': config.REDIRECT_URI,
      'scope': '/authenticate',
      'response_type':'code',
      'client_id': config.CLIENT_ID
    });
    
    res.render('pages/access_denied', {'authorization_uri': auth_link });      
  } else {
    // exchange code
    // function to render page after making request
    var exchangingCallback = function(error, response, body) {
      if (error == null) { // No errors! we have a token :-)

        var auth_link = config.AUTHORIZE_URI + '?'
        + querystring.stringify({
          'redirect_uri': config.REDIRECT_URI,
          'scope': '/authenticate',
          'response_type':'code',
          'client_id': config.CLIENT_ID
        });

        var tokenJson = JSON.parse(body);
        console.log(tokenJson);
        var date = new Date();
        //Log ORCID info to file
        orcidLogger.log(date, tokenJson.name, tokenJson.orcid, req.session.share_info);
        req.session.orcid_id = tokenJson.orcid;
        

        //Google sheets
        var doc = new GoogleSpreadsheet(config.GOOGLE_DOC_KEY, 'private');
        var sheet;
        var creds = require('./key.json');
        doc.useServiceAccountAuth(creds, callback);

        doc.getInfo(function(err, info) {
          console.log('Loaded doc: '+info.title+' by '+info.author.email);
          sheet = info.worksheets[0];
          console.log('sheet 1: '+sheet.title+' '+sheet.rowCount+'x'+sheet.colCount);
          sheet.addRow({"date" : date, "name" : tokenJson.name, "orcid" : tokenJson.orcid, "share info" : req.session.share_info}, callback);
        });
        //node-google-spreadsheet requires a callback
        function callback(err) {
          if (err) {
            console.log(err);
          } else {
            console.log("success");
          }
        } 

        res.render('pages/success', { 'body': JSON.parse(body), 'authorization_uri': auth_link});
        
      } else // handle error
        res.render('pages/error', { 'error': error });
    };

    // config for exchanging code for token 
    var exchangingReq = {
      url: config.TOKEN_EXCHANGE_URI,
      method: 'post',
      body: querystring.stringify({
        'code': req.query.code,
        'client_id': config.CLIENT_ID,
        'client_secret': config.CLIENT_SECRET,
        'grant_type': 'authorization_code',
      }),
      headers: {
        'content-type': 'application/x-www-form-urlencoded; charset=utf-8'
      }
    }
  
    //making request exchanging code for token
    request(exchangingReq, exchangingCallback);
  }
});