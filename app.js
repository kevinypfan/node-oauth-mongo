var express = require("express"),
  bodyParser = require("body-parser"),
  mongoose = require("mongoose"),
  path = require("path"),
  OAuth2Server = require("oauth2-server"),
  userRouter = require("./routes/user"),
  Request = OAuth2Server.Request,
  Response = OAuth2Server.Response;

var session = require("express-session");
const MongoStore = require("connect-mongo")(session);

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

app.use(
  session({
    secret: "recommand 128 bytes random string",
    store: new MongoStore({ url: mongoUri }),
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 600 * 1000 } //10分鐘到期
  })
);

app.use(userRouter);

app.oauth = new OAuth2Server({
  debug: true,
  model: require("./model.js"),
  grants: ["password", "authorization_code", "refresh_token"],
  accessTokenLifetime: 60 * 60,
  allowBearerTokensInQueryString: true
});

app.get("/oauth/authorize/consent", (req, res, next) => {
  res.sendFile(path.resolve(__dirname, "./views/consent.html"));
});

app.post(
  "/oauth/authorize/consent",
  (req, res, next) => {
    // request.query.allowed = "false" will denied.
    res.send(req.body);
  },
  authorizeHandler({
    authenticateHandler: {
      handle: function(request, response) {
        return request.session.user;
      }
    }
  })
);

app.get(
  "/oauth/authorize",
  function(req, res, next) {
    if (!req.session.user) {
      return res.redirect(
        "/login?redirect=" +
          req.path +
          "&client_id=" +
          req.query.client_id +
          "&redirect_uri=" +
          req.query.redirect_uri +
          "&state=" +
          req.query.state
      );
    }
    //TODO:  SHOW THEM  "do you authorise xyz app to access your content?" page
    if (!req.session.consent) {
      return res.redirect(
        "/oauth/authorize/consent?redirect=" +
          req.path +
          "&client_id=" +
          req.query.client_id +
          "&redirect_uri=" +
          req.query.redirect_uri +
          "&state=" +
          req.query.state
      );
    }
    next();
  },
  authorizeHandler({
    authenticateHandler: {
      handle: function(request, response) {
        return request.session.user;
      }
    }
  }),
  (req, res) => {}
);

app.all("/oauth/token", obtainToken);

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
