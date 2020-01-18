var mongoose = require("mongoose"),
  bcrypt = require("bcryptjs"),
  modelName = "user",
  schemaDefinition = require("../schema/" + modelName),
  schemaInstance = mongoose.Schema(schemaDefinition);

schemaInstance.pre("save", function(next) {
  var user = this;
  if (user.isModified("password")) {
    bcrypt.hash(user.password, 12).then(hash => {
      user.password = hash;
      next();
    });
  } else {
    next();
  }
});

module.exports = mongoose.model(modelName, schemaInstance);
