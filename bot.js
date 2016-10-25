var request = require("request");

var api = "https://discordapp.com/api";
var guild_id = "132818688242876417";
//var channel_id = "239253739305828352";

var bot_token = "";

function sendMessage(messageContent, channel)
{
	var options = {
		url: api + "/channels/" + channel + "/messages",
		headers: {
			"Authorization": "Bot " + bot_token,
		},
		body: {
			"content": messageContent,
		},
		json:true
	};
	request.post(options, function(err,res,body) {
		if(err)
			return console.log(err);

		if(res.statusCode !== 200){
			console.log('Invalid Status Code Returned: ' + res.statusCode);
			return console.log(body);
		}

		console.log("Message created:", body);
	});
}

var WebSocket = require("ws");
var cheerio = require("cheerio");

request.get(api + "/gateway", function(err,res,body) {
	
	var jsonBody = JSON.parse(body);
	var ws = new WebSocket(jsonBody.url);
	var heartbeatTimer;
	
	var channels = {};
	
	ws.on('open', function() {
		console.log("Connection opened");
		
		var j = JSON.stringify({
			"op": 2,
			"d": {
				"token": bot_token,
				"properties": {
					"$os": "linux",
					"$browser": "sometestingbrowser",
					"$device": "sometestingdevice",
					"$referrer": "",
					"$referring_domain": "",
				},
				"compress": false,
				"large_threshold": 250,
			}
		});
		ws.send(j);
	});
	
	ws.on('close', function(a,b) {
		console.log("Connection closed", a,b);
	});
	ws.on('message', function(message) {
		var parsed = JSON.parse(message);
		console.log(parsed.t);
		if(parsed.t == "READY")
		{
			heartbeatTimer = setInterval(function() {
				var heartbeatPackage = JSON.stringify({
					"op": 1,
					"d": null
				});
				ws.send(heartbeatPackage);
			}, parsed.d.heartbeat_interval);
			
			var j = JSON.stringify({
				"op": 3,
				"d": {
					"idle_since": null,
					"game": {
						"name": "No game",
					}
				}
			});
			ws.send(j);
			
			// var j2 = JSON.stringify({
				// "op": 4,
				// "d": {
					// "guild_id": guild_id,
					// "channel_id": "132818688242876418",
					// "self_mute": false,
					// "self_deaf": false,
				// }
			// });
			// ws.send(j2);
		}
		else if(parsed.t == "MESSAGE_CREATE")
		{
			var message = parsed.d;
			var prefix = "-";
			if(message.content == prefix + "help")
			{
				var commandList = "";
				commandList += "`here`: Tell the bot to watch for commands in this channel.";
				commandList += "\n\n`nohere`: Tell the bot to stop watching for commands in this channel.";
				commandList += "\n\n`is [term]`: (Image Search) Search for an image using the term and display a random one of ten.";
				commandList += "\n\n`calc [equation]`: Get the answer to the equation. (if the result is 'answer', the equation is invalid)";
				commandList += "\n\n`us [-d] [term]`: (Unicode Search) Search for unicode characters using the term. [-d] bypasses 30 result limit";
				commandList += "\n\n`av [term]`: Get the avatar image for the term.";
				sendMessage("Here you go <@" + message.author.id + ">\n" + commandList + "", message.channel_id);
			}
			else if(message.content == prefix + "here")
			{
				channels[message.channel_id] = true;
				sendMessage("Now doing things in this channel :stuck_out_tongue:", message.channel_id);
			}
			else if(message.content == prefix + "nohere")
			{
				channels[message.channel_id] = false;
				sendMessage("No longer doing things in this channel :sob:", message.channel_id);
			}
			else if(message.author.bot != true)
			{
				if(channels[message.channel_id] == true)
				{
					if(message.content.startsWith(prefix + "is"))
					{
						var arg = message.content.replace(prefix + "is ", "");
						console.log("Image searching:", arg);
						var key = "AIzaSyCXTMUwy7WPxyf0dfa8iLMq3o2g1i1ynrs";
						var cx = "018379100658891605811:ygibbtc-lsg";
						var host = "https://www.googleapis.com/customsearch/v1?";
						var url = host + "key=" + key + "&cx=" + cx + "&searchType=image&q=" + encodeURI(arg);

						request(url, function(err,res,body) {
							var json = JSON.parse(body);
							var num = Math.floor(Math.random()*json.items.length);
							var imageUrl = json.items[num].link;
							sendMessage("<@" + message.author.id + "> searched for *" + arg + "*\n" + imageUrl, message.channel_id);
						});
					}
					else if(message.content.startsWith(prefix + "calc"))
					{
						var arg = message.content.replace(prefix + "calc ", "");
						var host = "https://www.calcatraz.com/calculator/api?c=";
						var url = host + encodeURI(arg);
						
						arg = arg.replace("*","\\*");
						arg = arg.replace("~","\\~");
						arg = arg.replace("_","\\_");
						
						request(url, function(err,res,body) {
							sendMessage("<@" + message.author.id + "> did a calculation\n" + arg + " = " + body, message.channel_id);
						});
					}
					else if(message.content.startsWith(prefix + "us"))
					{
						var arg = message.content.replace(prefix + "us ", "");
						//Check for dangerous flag (no limit)
						var dangerous = message.content.includes("-d");
						arg = arg.replace("-d ", "")
						var header = "<@" + message.author.id + "> requested a unicode search for *" + arg + "*\n";
						var host = "http://www.fileformat.info/info/unicode/char/search.htm?q=";
						var url = host + encodeURI(arg);
						
						console.log("Unicode searching:", arg);
						
						request(url, function(err,res,body) {
							var $ = cheerio.load(body);
							
							var characters = [];
							var rows = $(".row0,.row1");
							if(rows.length <= 30 || dangerous)
							{
								rows.filter(function() {
									var row = $(this);
									
									var obj = {};
									obj.charCode = row.children(':nth-child(2)').first().text();
									var description = row.children(':nth-child(3)').text();
									//Capitalise first letter of each word
									description = description.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
									obj.description = description;
									obj.character = row.children(':nth-child(4)').first().text();
									characters[obj.charCode] = obj;
								});
								
								var collatedMessage = "";
								for(characterCode in characters)
								{
									var character = characters[characterCode];
									collatedMessage += character.character + " - " + character.charCode + " - " + character.description + "\n";
								}
								if(collatedMessage.length <= 2000)
								{
									sendMessage(header + collatedMessage, message.channel_id);
								}
								else
								{
									sendMessage(header + "Results were too long to send, please narrow your search. May be because of -d tag.", message.channel_id);
								}
							}
							else
							{
								sendMessage(header + "There were however too many results (" + rows.length + "). Please narrow your search (or use dangerous -d).", message.channel_id);
							}
						});
					}
					else if(message.content.startsWith(prefix + "av"))
					{
						var arg = message.content.replace(prefix + "av ", "");
						var host = "https://api.adorable.io/avatars/256/";
						
						//request(url, function(err,res,body) {
							sendMessage("<@" + message.author.id + "> wants an avatar for *" + arg + "*\n" + host + encodeURI(arg), message.channel_id);
						//});
					}
					/*else
					{
						sendMessage("<@" + message.author.id + "> said: \n\t*" + message.content + "*", message.channel_id);
					}*/
				}
			}
		}
		//console.log(parsed);
	});
	ws.on('error', function(data, flags) {
		console.log("Error: ",data);
	});
});

var http = require('http');
var server = http.createServer(function(req, res) {
	res.write("Running Discord Bot");
	res.end();
});

server.listen(process.env.PORT, function(){
    console.log("Server started on ", process.env.PORT);
});
