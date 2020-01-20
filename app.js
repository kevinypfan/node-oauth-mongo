const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const userRouter = require("./routes/user");
const oauthRouter = require("./routes/oauth");
const session = require("express-session");
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
app.use("/oauth", oauthRouter);

app.listen(3000);
