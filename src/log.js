const fs = require("fs-extra");

function nowString(date)
{
	return "[" + date.toLocaleString("en-au", {hour12:false}) + "]";
}
module.exports = function() {
	let date = new Date();
	let s = nowString(date);
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
	const paddedMonth = `${date.getUTCMonth()+1}`.padStart(2, "0");
	fs.appendFile(`${date.getUTCFullYear()}-${paddedMonth}-log.log`, s + "\r\n", err => {
		if(err)
			console.log(err);
	});
};