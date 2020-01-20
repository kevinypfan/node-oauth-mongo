const { Router } = require("express");
const OAuth2Server = require("oauth2-server");

const Request = OAuth2Server.Request;
const Response = OAuth2Server.Response;

const router = new Router();

router.oauth = new OAuth2Server({
  debug: true,
  model: require("../model.js"),
  grants: ["password", "authorization_code", "refresh_token"],
  accessTokenLifetime: 60 * 60,
  allowBearerTokensInQueryString: true
});

router.get("/verify", authenticateRequest, (req, res) => {
  // console.log(res.locals.oauth.token);
  res.send(res.locals.oauth.token);
});

router.get("/authorize/consent", (req, res, next) => {
  res.render("consent", { query: req._parsedUrl.search });
});

router.post("/authorize/consent", (req, res, next) => {
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
  //   res.send(req.query.returnUri + "?" + params.toString());
  res.redirect(req.query.returnUri + "?" + params.toString());
});

router.get(
  "/authorize",
  function(req, res, next) {
    if (!req.session.user) {
      return res.redirect(
        "/login?returnUri=" +
          req._parsedOriginalUrl.pathname +
          "&" +
          req._parsedUrl.query
      );
    }
    //TODO:  SHOW THEM  "do you authorise xyz app to access your content?" page
    // if (req.query.allowed === "false") {
    //   return res.redirect(
    //     req.query.redirect_uri +
    //       "?" +
    //       "error=access_denied&error_description=The+resource+owner+denied+the+request.&state=" +
    //       req.query.state
    //   );
    // }

    if (!req.session.consent && !req.query.allowed) {
      return res.redirect(
        "/oauth/authorize/consent?returnUri=" +
          req._parsedOriginalUrl.pathname +
          "&" +
          req._parsedUrl.query
      );
    }
    next();
  },
  authorizeHandler({
    authenticateHandler: {
      handle: function(request, response) {
        console.log("request.query.allowed", request.query.allowed);

        return request.session.user;
      }
    }
  }),
  (req, res) => {
    // TODO: if denied error=access_denied&error_description=The+resource+owner+denied+the+request.&state=0987poi
    // console.log(res.locals.oauth.code);
    const params = new URLSearchParams();
    params.append("code", res.locals.oauth.code.authorizationCode);
    params.append("state", req.query.state);

    res.redirect(req.query.redirect_uri + "?" + params.toString());
  }
);

router.all("/token", obtainToken);

router.get("/", authenticateRequest, function(req, res) {
  //   console.log(res.locals.oauth.token);
  res.send("Congratulations, you are in a secret area!");
});

function obtainToken(req, res) {
  var request = new Request(req);
  var response = new Response(res);

  return router.oauth
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

  return router.oauth
    .authenticate(request, response)
    .then(function(token) {
      res.locals.oauth = { token: token };
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
    return router.oauth
      .authorize(request, response, options)
      .then(function(code) {
        // console.log(code);
        res.locals.oauth = { code: code };
        next();
      })
      .catch(function(err) {
        // console.log(err);
        // response_type: 'code',
        // client_id: 'application',
        // redirect_uri: 'http://www.infosecinstitute.com',
        // state: 'something',
        // allowed: 'false'
        if (
          req.query.allowed === "false" &&
          req.query.response_type === "code" &&
          req.query.redirect_uri
        ) {
          const params = new URLSearchParams();
          // statusCode: 400,
          // status: 400,
          // code: 400,
          // message: 'Access denied: user denied access to application',
          // name: 'access_denied'
          params.append("error_name", err.name);
          params.append("error_code", err.code);
          params.append("error_message", err.message);
          params.append("state", req.query.state);
          return res.redirect(req.query.redirect_uri + "?" + params.toString());
        }
        console.log(req);
        res.status(err.code || 500).json(err);
      });
  };
}

module.exports = router;
