module.exports = {
  authorizationCode: String,
  expiresAt: Date,
  redirectUri: String,
  scope: String,
  clientId: String,
  username: String,
  revoked: { type: Boolean, default: false }
};
