var clientModel = require("./mongo/model/client"),
  accessTokenModel = require("./mongo/model/accessToken"),
  refreshTokenModel = require("./mongo/model/refreshToken"),
  authorizationCodeModel = require("./mongo/model/authorizationCode"),
  userModel = require("./mongo/model/user");
const OAuthError = require("oauth2-server/lib/errors/oauth-error");
const bcrypt = require("bcryptjs");

const saveToken = function(token, client, user) {
  console.log(user);
  let fns = [
    new accessTokenModel({
      accessToken: token.accessToken,
      expiresAt: token.accessTokenExpiresAt,
      scope: token.scope,
      clientId: client.clientId,
      username: user.username
    }).save(),
    new refreshTokenModel({
      refreshToken: token.refreshToken,
      expiresAt: token.refreshTokenExpiresAt,
      scope: token.scope,
      clientId: client.clientId,
      username: user.username
    }).save()
  ];
  return Promise.all(fns).then(([accessToken, refreshToken]) => {
    // console.log(accessToken);
    // console.log(refreshToken);
    return {
      accessToken: accessToken.accessToken,
      accessTokenExpiresAt: accessToken.expiresAt,
      refreshToken: refreshToken.refreshToken,
      refreshTokenExpiresAt: refreshToken.expiresAt,
      scope: accessToken.scope,
      client: { id: accessToken.clientId },
      user: { username: accessToken.username }
    };
  });
};

var getAccessToken = function(token, callback) {
  accessTokenModel
    .findOne({
      accessToken: token,
      revoked: false
    })
    .lean()
    .exec(
      function(callback, err, token) {
        if (!token) {
          console.error("Token not found");
        }

        callback(err, token);
      }.bind(null, callback)
    );
};

var getClient = function(clientId, clientSecret) {
  console.log("clientId = ", clientId);
  return clientModel
    .findOne({
      clientId: clientId
    })
    .lean()
    .then(client => ({
      clientId: client.clientId,
      redirectUris: client.redirectUris,
      grants: client.grants
    }));
};

var getUser = function(username, password) {
  return userModel
    .findOne({
      username: username
    })
    .lean()
    .then(user => {
      const err = new OAuthError("username or password incorrect", {
        code: 401
      });
      if (!user) return err;
      return new Promise((resolve, reject) => {
        bcrypt.compare(password, user.password).then(res => {
          if (res) {
            resolve(user);
          } else {
            reject(err);
          }
        });
      });
    });
};

// var getUserFromClient = function(client) {
//   console.log("getUserFromClient => ", client);
//   return userModel
//     .findOne({
//       username: client.username
//     })
//     .lean();
// };

var getRefreshToken = function(refreshToken) {
  console.log(refreshToken);
  return refreshTokenModel
    .findOne({
      refreshToken: refreshToken,
      revoked: false
    })
    .then(token => {
      return Promise.all([
        token,
        clientModel({ clientId: token.clientId }),
        userModel({ username: token.username })
      ]);
    })
    .then(([token, client, user]) => {
      return {
        refreshToken: token.refreshToken,
        refreshTokenExpiresAt: token.expiresAt,
        scope: token.scope,
        client: client, // with 'id' property
        user: user
      };
    });
};

var revokeToken = function(token) {
  return refreshTokenModel.updateOne(
    {
      refreshToken: token.refreshToken
    },
    { $set: { revoked: true } }
  );
};

function getAuthorizationCode(authorizationCode) {
  return authorizationCodeModel
    .findOne({ authorizationCode: authorizationCode, revoked: false })
    .then(function(code) {
      return Promise.all([
        code,
        clientModel({ clientId: code.clientId }),
        userModel({ username: code.username })
      ]);
    })
    .then(([code, client, user]) => {
      return {
        code: code.authorizationCode,
        expiresAt: code.expiresAt,
        redirectUri: code.redirectUri,
        scope: code.scope,
        client: client, // with 'id' property
        user: user
      };
    });
}

function saveAuthorizationCode(code, client, user) {
  console.log("saveAuthorizationCode");
  let authCode = {
    authorizationCode: code.authorizationCode,
    expiresAt: code.expiresAt,
    redirectUri: code.redirectUri,
    scope: code.scope,
    clientId: client.clientId,
    username: user.username
  };
  return new authorizationCodeModel(authCode)
    .save()
    .then(function(authorizationCode) {
      return {
        authorizationCode: authorizationCode.authorizationCode,
        expiresAt: authorizationCode.expiresAt,
        redirectUri: authorizationCode.redirectUri,
        scope: authorizationCode.scope,
        client: { id: authorizationCode.clientId },
        user: { username: authorizationCode.username }
      };
    });
}

function revokeAuthorizationCode(code) {
  return authorizationCodeModel.updateOne(
    {
      authorizationCode: code.authorizationCode
    },
    { $set: { revoked: true } }
  );
}

/**
 * Export model definition object.
 */

module.exports = {
  getAccessToken: getAccessToken,
  getClient: getClient,
  saveToken: saveToken,
  getUser: getUser,
  //   getUserFromClient: getUserFromClient,
  getRefreshToken: getRefreshToken,
  revokeToken: revokeToken,
  getAuthorizationCode,
  saveAuthorizationCode,
  revokeAuthorizationCode
};
