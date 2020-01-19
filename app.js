var express = require("express"),
  bodyParser = require("body-parser"),
  mongoose = require("mongoose"),
  path = require("path"),
  OAuth2Server = require("oauth2-server"),
  userRouter = require("./routes/user"),
  Request = OAuth2Server.Request,
  Response = OAuth2Server.Response;

const { URLSearchParams } = require("url");
var session = require("express-session");
const MongoStore = require("connect-mongo")(session);

var app = express();

app.set("view engine", "ejs");
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
  res.render("consent", { query: req._parsedUrl.search });
});

app.post("/oauth/authorize/consent", (req, res, next) => {
  // request.query.allowed = "false" will denied.
  const copyQuery = { ...req.query };
  delete copyQuery.returnUri;
  const params = new URLSearchParams();
  for (let el in copyQuery) {
    params.append(el, copyQuery[el]);
  }
  if (req.body.allow) {
    req.session.consent = true;
    params.append("allowed", "true");
  } else {
    params.append("allowed", "false");
  }
  res.redirect(req.query.returnUri + "?" + params.toString());
});

app.get(
  "/oauth/authorize",
  function(req, res, next) {
    if (!req.session.user) {
      return res.redirect(
        "/login?returnUri=" + req.path + "&" + req._parsedUrl.query
      );
    }
    //TODO:  SHOW THEM  "do you authorise xyz app to access your content?" page
    console.log("req.query.allowed", req.query.allowed === "false");
    if (req.query.allowed === "false") {
      return res.redirect(
        req.query.redirect_uri +
          "?" +
          "error=access_denied&error_description=The+resource+owner+denied+the+request.&state=" +
          req.query.state
      );
    }

    if (!req.session.consent) {
      return res.redirect(
        "/oauth/authorize/consent?returnUri=" +
          req.path +
          "&" +
          req._parsedUrl.query
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
  (req, res) => {
    // TODO: if denied error=access_denied&error_description=The+resource+owner+denied+the+request.&state=0987poi
    console.log(res.locals.oauth.code);
    const params = new URLSearchParams();
    params.append("code", res.locals.oauth.code.authorizationCode);
    params.append("state", req.query.state);

    res.redirect(req.query.redirect_uri + "?" + params.toString());
  }
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
