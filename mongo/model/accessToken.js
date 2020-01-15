var mongoose = require("mongoose"),
  modelName = "accessToken",
  schemaDefinition = require("../schema/" + modelName),
  schemaInstance = mongoose.Schema(schemaDefinition),
  modelInstance = mongoose.model(modelName, schemaInstance);

module.exports = modelInstance;
