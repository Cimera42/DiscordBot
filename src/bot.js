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
		//console.log(now(), "Message created:", body);
	}).catch(err => {
		console.log(now(), 'Error createM: ' + err);
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
		console.log(now(), 'Error getM: ' + err);
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
		console.log(now(), 'Error getGu: ' + err);
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
		console.log(now(), 'Error getGr: ' + err);
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
		console.log(now(), 'Error getCh: ' + err);
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
		console.log(now(), 'Error delRe: ' + err);
	});
}

var WebSocket = require("ws");
var cheerio = require("cheerio");
var fs = require("fs");

var gateway;
var lastHeartbeatAck;
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
		console.log(now(), "Adding channel " + message.channel_id);
	}
}

function start()
{
	request.get(api + "/gateway", function(err,res,body) {
		var jsonBody = JSON.parse(body);
		gateway = jsonBody.url + "/?v=6&encoding=json";
		
		connect(false);
	});
}

function updateGame(ws, game)
{
	var j = JSON.stringify({
		"op": 3,
		"d": {
			"idle_since": null,
			"game": {
				"name": game || "No Game",
			}
		}
	});
	ws.send(j);
}

function sendHeartbeat(ws)
{
	console.log(now(), "HEARTBEAT SENT", lastWebsocketSequence);
	var heartbeatPackage = JSON.stringify({
		"op": 1,
		"d": lastWebsocketSequence
	});
	ws.send(heartbeatPackage);
	setTimeout(()=>checkHeartbeat(ws), 20000);
}

function checkHeartbeat(ws)
{
	if(new Date().getTime() > lastHeartbeatAck.getTime()+20000)
	{
		ws.close(1012, "No heartbeat acknowledgement received for 30 seconds");
	}
}

function now()
{
	return "[" + new Date().toLocaleTimeString("en-au", {hour12:false}) + "]";
}

function connect(resume)
{
	var ws = new WebSocket(gateway);
	var heartbeatTimer;
	var heartbeatInterval;
	var updateGameTimer;
	
	channels = JSON.parse(fs.readFileSync("./channels.json").toString());
	
	ws.onopen = function(ev) {
		console.log(now(), "Connection opened");
	};
	
	ws.onclose = function(ev) {
		console.log(now(), "Connection closed", ev.code,ev.reason);
		clearInterval(heartbeatTimer);
		clearInterval(updateGameTimer);
		setTimeout(()=>connect(true), 3000);
	};
	ws.onerror = function(ev) {
		console.log(now(), "E", ev);
		console.log(now(), "Websocket Error: ", err);
	};
	ws.onmessage = function(ev) {
		var message = ev.data;
		var parsed = JSON.parse(message);
		console.log(now(), parsed.op, parsed.s, parsed.t);
		//console.log(now(), parsed);
		if(parsed.op === 9)
		{
			console.log(now(), "Invalid session, restarting connection in 8 seconds");
			setTimeout(()=>connect(true), 8000);
		}
		else if(parsed.op === 10)
		{
			console.log(now(), parsed);
			heartbeatInterval = parsed.d.heartbeat_interval;
			heartbeatTimer = setInterval(function() {
				sendHeartbeat(ws);
			}, heartbeatInterval);
			
			if(resume)
			{
				var j = JSON.stringify({
					"op": 6,
					"d": {
						"token": bot_token,
						"session_id": websocketSessionId,
						"seq": lastWebsocketSequence
					}
				});
				ws.send(j);
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
				ws.send(j);
			}
		}
		else if(parsed.op === 11)
		{
			lastHeartbeatAck = new Date();
		}
		else if(parsed.op === 0)
		{
			lastWebsocketSequence = parsed.s || lastWebsocketSequence;
			if(parsed.t === "READY")
			{
				websocketSessionId = parsed.d.session_id;
				
				var g = "No Game, Life";
				updateGame(ws, g)
				updateGameTimer = setInterval(() => updateGame(ws, g), heartbeatInterval*10);
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
		}
	};
}

if(bot_token)
	start();

// var http = require('http');
// var server = http.createServer(function(req, res) {
	// res.write("Running Discord Bot");
	// res.end();
// });

// server.listen(process.env.PORT, function(){
    // console.log(now(), "Server started on ", process.env.PORT);
// });
