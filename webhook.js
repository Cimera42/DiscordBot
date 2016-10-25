var request = require("request");

var api = "https://discordapp.com/api";
var webhook_id = "239252214441443328";
var webhook_token = "";
var extra = "/webhooks/" + webhook_id + "/" + webhook_token;

var options = {
	url: api + extra,
	headers: {
		"Content-Type": "application/json",
	},
	form: {"content": new Date()}
};
request.post(options);