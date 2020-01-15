var mongoUri = "mongodb://dev.kevins.fun/oauth";
const mongoose = require("mongoose");

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

var clientModel = require("./mongo/model/client"),
  userModel = require("./mongo/model/user");

var loadExampleData = function() {
  var client1 = new clientModel({
    id: "application", // TODO: Needed by refresh_token grant, because there is a bug at line 103 in https://github.com/oauthjs/node-oauth2-server/blob/v3.0.1/lib/grant-types/refresh-token-grant-type.js (used client.id instead of client.clientId)
    clientId: "application",
    clientSecret: "secret",
    grants: ["password", "refresh_token"],
    redirect_uris: []
  });

  var client2 = new clientModel({
    clientId: "confidentialApplication",
    clientSecret: "topSecret",
    grants: ["password", "client_credentials"],
    redirect_uris: []
  });

  var user = new userModel({
    username: "pedroetb",
    password: "password"
  });

  client1.save(function(err, client) {
    if (err) {
      return console.error(err);
    }
    console.log("Created client", client);
  });

  user.save(function(err, user) {
    if (err) {
      return console.error(err);
    }
    console.log("Created user", user);
  });

  client2.save(function(err, client) {
    if (err) {
      return console.error(err);
    }
    console.log("Created client", client);
  });
};

loadExampleData();
