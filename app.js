var express = require("express"),
  bodyParser = require("body-parser"),
  mongoose = require("mongoose"),
  OAuth2Server = require("oauth2-server"),
  Request = OAuth2Server.Request,
  Response = OAuth2Server.Response;

var app = express();

app.use(bodyParser.urlencoded({ extended: true }));

app.use(bodyParser.json());

var mongoUri = "mongodb://dev.kevins.fun/oauth";

mongoose.connect(
  mongoUri,
  {
    useCreateIndex: true,
    useNewUrlParser: true
  },
  function(err, res) {
    if (err) {
      return console.error('Error connecting to "%s":', mongoUri, err);
    }
    console.log('Connected successfully to "%s"', mongoUri);
  }
);

app.oauth = new OAuth2Server({
  debug: true,
  model: require("./model.js"),
  grants: ["password", "authorization_code"],
  accessTokenLifetime: 60 * 60,
  allowBearerTokensInQueryString: true
});

app.get(
  "/oauth/authorize",
  function(req, res, next) {
    // if (!req.session.user) {
    //   return res.redirect(
    //     "/login?redirect=" +
    //       req.path +
    //       "&client_id=" +
    //       req.query.client_id +
    //       "&redirect_uri=" +
    //       req.query.redirect_uri
    //   );
    // }
    //TODO:  SHOW THEM  "do you authorise xyz app to access your content?" page

    req.body.allow = "yes";
    next();
  },
  authorizeHandler({
    authenticateHandler: {
      handle: function(request, response) {
        return {
          username: "pedroetb",
          password: "password"
        };
      }
    }
  })
);

app.all("/oauth/token", obtainToken);
// app.all("/oauth/authorize", authorizeHandler);

app.get("/", authenticateRequest, function(req, res) {
  res.send("Congratulations, you are in a secret area!");
});

app.listen(3000);

function obtainToken(req, res) {
  var request = new Request(req);
  var response = new Response(res);

  return app.oauth
    .token(request, response)
    .then(function(token) {
      res.json(token);
    })
    .catch(function(err) {
      res.status(err.code || 500).json(err);
    });
}

function authenticateRequest(req, res, next) {
  var request = new Request(req);
  var response = new Response(res);

  return app.oauth
    .authenticate(request, response)
    .then(function(token) {
      next();
    })
    .catch(function(err) {
      res.status(err.code || 500).json(err);
    });
}

function authorizeHandler(options) {
  return function(req, res, next) {
    let request = new Request(req);
    let response = new Response(res);
    return app.oauth
      .authorize(request, response, options)
      .then(function(code) {
        console.log(code);
        res.locals.oauth = { code: code };
        next();
      })
      .catch(function(err) {
        console.log(err);
        res.status(err.code || 500).json(err);
      });
  };
}
