// config/database.js
module.exports = {

 //   'url' : 'mongodb://colin777:1234@cluster0-shard-00-02-zpmkl.mongodb.net:27017' // looks like mongodb://<user>:<pass>@mongo.onmodulus.net:27017/Mikha4ot

     'url' : 'mongodb://colin777:1234@cluster0-shard-00-02-zpmkl.mongodb.net:27017,cluster0-shard-00-02-zpmkl.mongodb.net:27017,cluster0-shard-00-02-zpmkl.mongodb.net:27017/Cluster0?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin'

};