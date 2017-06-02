var request = require("request-promise");

var api = "https://discordapp.com/api";
var guild_id = "132818688242876417";
//var channel_id = "239253739305828352";

var bot_token = null || process.env.bot_token;

function sendMessage(messageContent, channel, embed)
{
	var options = {
		method: "POST",
		url: api + "/channels/" + channel + "/messages",
		headers: {
			"Authorization": "Bot " + bot_token,
		},
		body: {
			"content": messageContent,
			"embed": embed
		},
		json:true
	};
	request(options).then(body => {
		//console.log("Message created:", body);
	}).catch(err => {
		console.log('Error createM: ' + err);
	});
}

function getMessage(messageId, channel, callback)
{
	var options = {
		method: "GET",
		url: api + "/channels/" + channel + "/messages/" + messageId,
		headers: {
			"Authorization": "Bot " + bot_token,
		},
		json:true
	};
	request(options).then(body => {
		callback(body);
	}).catch(err => {
		console.log('Error getM: ' + err);
	});
}

function getGuildUser(userId, guildId, callback)
{
	var options = {
		method: "GET",
		url: api + "/guilds/" + guildId + "/members/" + userId,
		headers: {
			"Authorization": "Bot " + bot_token,
		},
		json:true
	};
	request(options).then(body => {
		callback(body);
	}).catch(err => {
		console.log('Error getGu: ' + err);
	});
}

function getGuildRoles(guildId, callback)
{
	var options = {
		method: "GET",
		url: api + "/guilds/" + guildId + "/roles",
		headers: {
			"Authorization": "Bot " + bot_token,
		},
		json:true
	};
	request(options).then(body => {
		callback(body);
	}).catch(err => {
		console.log('Error getGr: ' + err);
	});
}

function getChannel(channelId, callback)
{
	var options = {
		method: "GET",
		url: api + "/channels/" + channelId,
		headers: {
			"Authorization": "Bot " + bot_token,
		},
		json:true
	};
	request(options).then(body => {
		callback(body);
	}).catch(err => {
		console.log('Error getCh: ' + err);
	});
}

function deleteReact(channelId, messageId, emoji, userId)
{
	var options = {
		method: "DELETE",
		url: api + "/channels/" + channelId + "/messages/" + messageId + "/reactions/" + emoji + "/" + userId,
		headers: {
			"Authorization": "Bot " + bot_token,
		},
		json:true
	};
	request(options).then(body => {
		
	}).catch(err => {
		console.log('Error delRe: ' + err);
	});
}

var WebSocket = require("websocket").client;
var cheerio = require("cheerio");
var fs = require("fs");

var gateway;
var lastWebsocketSequence = null;
var websocketSessionId = null;
var channels;
function syncChannels()
{
	fs.writeFileSync("./channels.json", JSON.stringify(channels,null,4));
}
function checkChannel(message)
{
	if(!channels[message.channel_id])
	{
		channels[message.channel_id] = {enabled:false, mention:false};
		console.log("Adding channel " + message.channel_id);
	}
}

function start()
{
	request.get(api + "/gateway", function(err,res,body) {
		var jsonBody = JSON.parse(body);
		gateway = jsonBody.url + "/encoding=json&v=6";
		
		connect(false);
	});
}

function connect(resume)
{
	var ws = new WebSocket();
	var heartbeatTimer;
	
	channels = JSON.parse(fs.readFileSync("./channels.json").toString());
	
	ws.on('connect', function(connection) {
		console.log("Connection opened");
		
		if(resume)
		{
			console.log(websocketSessionId);
			console.log(lastWebsocketSequence);
			var j = JSON.stringify({
				"op": 6,
				"d": {
					"token": bot_token,
					"session_id": websocketSessionId,
					"seq": lastWebsocketSequence
				}
			});
			connection.send(j);
		}
		else
		{
			var j = JSON.stringify({
				"op": 2,
				"d": {
					"token": bot_token,
					"properties": {
						"$os": "linux",
						"$browser": "node.js",
						"$device": "desktop",
						"$referrer": "",
						"$referring_domain": "",
					},
					"compress": false,
					"large_threshold": 250,
				}
			});
			connection.send(j);
		}
	
		connection.on('close', function(code,message) {
			console.log(new Date().toTimeString(), "Connection closed", code,message);
			clearInterval(heartbeatTimer);
			connect(true);
		});
		connection.on('error', function(err) {
			console.log("Websocket Error: ", err);
		});
		connection.on('message', function(message) {
			var parsed = JSON.parse(message.utf8Data);
			console.log(parsed.op, parsed.s, parsed.t);
			lastWebsocketSequence = parsed.s || lastWebsocketSequence;
			if(parsed.t == "READY")
			{
				console.log(parsed);
				websocketSessionId = parsed.d.session_id;
				heartbeatTimer = setInterval(function() {
					console.log(new Date().toTimeString(), "HEARTBEAT SENT", lastWebsocketSequence);
					var heartbeatPackage = JSON.stringify({
						"op": 1,
						"d": lastWebsocketSequence
					});
					connection.send(heartbeatPackage);
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
				connection.send(j);
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
					commandList += "\n\nAdd a :hash: react to quote a message";
					sendMessage("Here you go <@" + message.author.id + ">\n" + commandList + "", message.channel_id);
				}
				else if(message.content == prefix + "here")
				{
					getChannel(message.channel_id, channel => {
						getGuildUser(message.author.id, channel.guild_id, user => {
							getGuildRoles(channel.guild_id, roles => {
								var rids = user.roles;
								var r2ids = roles.map(v=>v.id);
								roles.filter(v=>rids.includes(v.id)).some(v=>{
									var p = v.permissions & 0x00000008;
									if(p > 0)
									{
										checkChannel(message);
										channels[message.channel_id].enabled = true;
										syncChannels();
										sendMessage("Now doing things in this channel :stuck_out_tongue:", message.channel_id);
									}
								})
							})
						})
					});	
				}
				else if(message.content == prefix + "nohere")
				{
					getChannel(message.channel_id, channel => {
						getGuildUser(message.author.id, channel.guild_id, user => {
							getGuildRoles(channel.guild_id, roles => {
								var rids = user.roles;
								var r2ids = roles.map(v=>v.id);
								roles.filter(v=>rids.includes(v.id)).some(v=>{
									var p = v.permissions & 0x00000008;
									if(p > 0)
									{
										checkChannel(message);
										channels[message.channel_id].enabled = false;
										syncChannels();
										sendMessage("No longer doing things in this channel :sob:", message.channel_id);
									}
								})
							})
						})
					});
				}
				// else if(message.author.bot != true)
				// {
					// checkChannel(message);
					// if(channels[message.channel_id].enabled == true)
					// {
						// if(message.content.startsWith(prefix + "is"))
						// {
							// var arg = message.content.replace(prefix + "is ", "");
							// console.log("Image searching:", arg);
						// }
					// }
				// }
			}
			else if(parsed.t == "MESSAGE_REACTION_ADD")
			{
				var messageData = parsed.d;
				checkChannel(messageData);
				if(channels[messageData.channel_id].enabled == true)
				{
					if(messageData.emoji.name.includes("#"))
					{
						getMessage(messageData.message_id, messageData.channel_id, msg => {
							getChannel(messageData.channel_id, channel => {
								getGuildUser(msg.author.id, channel.guild_id, quotedUser => {
									getGuildUser(messageData.user_id, channel.guild_id, quotingUser => {
										var d = ()=>(Math.floor(Math.random()*256)).toString(16);
										var s = "0x"+d()+d()+d();
										var m = "";
										if(channels[messageData.channel_id].mention)
											m = "<@!" + messageData.user_id + "> quoted <@!" + quotedUser.user.id + ">:";
										else if(!channels[messageData.channel_id].mention)
											m = "**" + (quotingUser.nick || quotingUser.user.username) + "** quoted **" + (quotedUser.nick || quotedUser.user.username) + "**:";
										
										sendMessage(m, messageData.channel_id, {
											"color": parseInt(s),
											"timestamp": msg.timestamp,
											"author": {
												"name": quotedUser.nick || quotedUser.user.username,
												"icon_url": quotedUser.user.avatar && "https://cdn.discordapp.com/avatars/" + quotedUser.user.id + "/" + quotedUser.user.avatar + ".png",
											},
											"description": msg.content
										});
										deleteReact(channel.id, messageData.message_id, "%23%E2%83%A3", messageData.user_id);
									});
								});
							});
						});
					}
				}
			}
			//console.log(parsed);
		});
	});
	ws.connect(gateway);
}

if(bot_token)
	start();

// var http = require('http');
// var server = http.createServer(function(req, res) {
	// res.write("Running Discord Bot");
	// res.end();
// });

// server.listen(process.env.PORT, function(){
    // console.log("Server started on ", process.env.PORT);
// });
