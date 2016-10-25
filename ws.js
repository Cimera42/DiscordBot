var request = require("request");
var WebSocket = require('ws');

//DO THIS THING???!?!??!?!??!
//http://scooterx3.net/?p=6
request.get("https://discordapp.com/api/gateway", function(err,res,body) {
	
	var jsonBody = JSON.parse(body);
	var ws = new WebSocket(jsonBody.url);

	ws.on('open', function () {
		console.log("Opened");
		var json = {
			"op": 2,
			"d": {
				"token":"",
				"properties": {
					"$os": "linux",
					"$browser": "sometestingbrowser",
					"$device": "sometestingdevice",
					"$referrer": "",
					"$referring_domain": "",
				},
			},
			"compress": true,
			"large_threshold": 250,
		}
		ws.send(JSON.stringify(json));
	});

	ws.on('message', function(data, flags) {
		console.log("aa",data);
	});
});