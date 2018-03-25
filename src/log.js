const fs = require("fs");

function now()
{
	return "[" + new Date().toLocaleString("en-au", {hour12:false}) + "]";
}
module.exports = function() {
	let s = now();
	for(const key in arguments)
	{
		try
		{
			s += " " + JSON.stringify(arguments[key]);
		}
		catch(e)
		{
			s += " [INVALID JSON OBJECT]";
		}
	}
	console.log(s);
	fs.appendFile("log.log", s + "\r\n", err => {
		if(err)
			console.log(err);
	});
};