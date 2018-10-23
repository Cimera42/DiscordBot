
switch(process.env.NODE_ENV)
{
case "test":
	module.exports = require("./config.test.js");
	break;

default:
	module.exports = require("./config.standard.js");
}