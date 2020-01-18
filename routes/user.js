const { Router } = require("express");
const _ = require("lodash");
const path = require("path");

const userModel = require("../mongo/model/user");

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
  res.sendFile(path.resolve(__dirname, "../views/login.html"));
});

router.post("/login", (req, res) => {
  console.log(req.session);
  req.session.user = { ...req.body };
  res.send(req.body);
});

module.exports = router;
