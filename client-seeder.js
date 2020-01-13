const mongoose = require('mongoose');
const Client = require('./mongo/model/client');
const User = require('./mongo/model/user');
var mongoUri = 'mongodb://dev.kevins.fun/oauth';

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

// {
// 	id: String,
// 	clientId: String,
// 	clientSecret: String,
// 	grants: [String],
// 	redirectUris: [String]
// }

const user = new User({ username: 'pedroetb', password: 'password' });
user.save().then(result => console.log(result));

const client = new Client({
  clientId: 'application',
  clientSecret: 'secret',
  grants: ['password']
});
client.save().then(result => console.log(result));
