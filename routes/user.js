const { Router } = require("express");
const _ = require("lodash");
const path = require("path");
const { URLSearchParams } = require("url");
const bcrypt = require("bcryptjs");
const userModel = require("../mongo/model/user");
const OAuthError = require("oauth2-server/lib/errors/oauth-error");

const router = new Router();

router.post("/signup", async (req, res) => {
  const user = new userModel({
    username: req.body.username,
    displayName: req.body.displayName,
    password: req.body.password,
    email: req.body.email
  });
  await user.save();
  res.send("okay!");
});

router.get("/signup", (req, res) => {
  res.sendFile(path.resolve(__dirname, "../views/signup.html"));
});

router.get("/login", (req, res) => {
  console.log(req._parsedUrl.search);
  res.render("login", { query: req._parsedUrl.search });

  //   res.sendFile(path.resolve(__dirname, "../views/login.html"));
});

router.post("/login", (req, res) => {
  userModel
    .findOne({
      username: req.body.username
    })
    .lean()
    .then(user => {
      const err = new OAuthError("username or password incorrect", {
        code: 401
      });
      if (!user) return err;
      return new Promise((resolve, reject) => {
        bcrypt.compare(req.body.password, user.password).then(res => {
          if (res) {
            resolve(user);
          } else {
            reject(err);
          }
        });
      });
    })
    .then(user => {
      const copyQuery = { ...req.query };
      delete copyQuery.returnUri;
      const params = new URLSearchParams();
      for (let el in copyQuery) {
        params.append(el, copyQuery[el]);
      }
      req.session.user = { ...user };
      res.redirect(req.query.returnUri + "?" + params.toString());
    })
    .catch(err => {
      console.log(err);
      res.render("login", { query: req._parsedUrl.search });
    });
});

module.exports = router;
