module.exports = {
  refreshToken: String,
  expiresAt: Date,
  scope: String,
  clientId: String,
  username: String,
  revoked: { type: Boolean, default: false }
};
