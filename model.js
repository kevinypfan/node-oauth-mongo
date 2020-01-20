var clientModel = require("./mongo/model/client"),
  accessTokenModel = require("./mongo/model/accessToken"),
  refreshTokenModel = require("./mongo/model/refreshToken"),
  authorizationCodeModel = require("./mongo/model/authorizationCode"),
  userModel = require("./mongo/model/user");
const OAuthError = require("oauth2-server/lib/errors/oauth-error");
const InvalidRequestError = require("oauth2-server/lib/errors/invalid-request-error");

const bcrypt = require("bcryptjs");

const saveToken = function(token, client, user) {
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

var getAccessToken = function(accessToken) {
  return accessTokenModel
    .findOne({
      accessToken: accessToken,
      revoked: false
    })
    .lean()
    .then(token => {
      //   if (!token) {
      //     //TODO: return error
      //     return new InvalidRequestError();
      //   }
      return Promise.all([
        token,
        clientModel.findOne({ clientId: token.clientId }),
        userModel.findOne({ username: token.username })
      ]);
    })
    .then(([token, client, user]) => {
      return {
        accessToken: token.accessToken,
        accessTokenExpiresAt: token.expiresAt,
        scope: token.scope,
        client: client, // with 'id' property
        user: user
      };
    });
};

var getClient = function(clientId, clientSecret) {
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
//   return userModel
//     .findOne({
//       username: client.username
//     })
//     .lean();
// };

var getRefreshToken = function(refreshToken) {
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
      if (!code) {
        const err = new OAuthError("Unauthorized", {
          code: 401,
          name: "invalid_code"
        });
        throw err;
      }
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
      authorizationCode: code.code
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
