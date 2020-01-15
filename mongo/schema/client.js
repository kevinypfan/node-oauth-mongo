module.exports = {
  id: String,
  clientId: { type: String, unique: true },
  clientSecret: String,
  grants: [String],
  redirectUris: [String]
};
