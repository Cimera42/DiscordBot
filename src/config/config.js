switch(process.env.NODE_ENV)
{
case "test": module.exports = require("./config.test.json"); break;
default: module.exports = require("./config.json");
}