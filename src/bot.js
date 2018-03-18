const request = require("request-promise");

const bot_token = null || process.env.bot_token;
const api = "https://discordapp.com/api";

const log = require("./log.js");
const dr = require("./discordRequests.js");

const WebSocket = require("ws");
const cheerio = require("cheerio");
const fs = require("fs");

var gateway;
var lastHeartbeatAck;
var heartbeatTimer;
var updateGameTimer;
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
		log("Adding channel " + message.channel_id);
	}
}

function checkRoles(roleMask, channel_id, author_id, guild_id)
{
	return new Promise((resolve, reject) => {
		dr.getChannel(message.channel_id).then(channel => {
			dr.getGuildUser(message.author.id, channel.guild_id).then(user => {
				dr.getGuildRoles(channel.guild_id).then(roles => {
					var rids = user.roles;
					var r2ids = roles.map(v=>v.id);
					roles.filter(v => rids.includes(v.id)).some(v=>{
						var p = v.permissions & roleMask;
						if(p > 0)
							resolve(true);
						else 
							resolve(false);
					});
				});
			});
		});
	});
}

function start()
{
	dr.getGateway().then(body => {
		var jsonBody = body;
		console.log(jsonBody);
		gateway = jsonBody.url + "/?v=6&encoding=json";
		
		connect(false);
	});
}

function updateGame(ws, game)
{
	var j = JSON.stringify({
		"op": 3,
		"d": {
			"since": null,
			"status": "online",
			"afk": false,
			"game": {
				"name": game || "No Game",
			}
		}
	});
	ws.send(j);
}

function sendHeartbeat(ws, interval)
{
	log("HEARTBEAT SENT", lastWebsocketSequence);
	var heartbeatPackage = JSON.stringify({
		"op": 1,
		"d": lastWebsocketSequence
	});
	ws.send(heartbeatPackage);
	var timeoutTime = interval*(1/2);
	setTimeout(()=>checkHeartbeat(ws,timeoutTime), timeoutTime);
}

function checkHeartbeat(ws, timeoutTime)
{
	if(new Date().getTime() > lastHeartbeatAck.getTime()+timeoutTime)
	{
		if(ws.readyState == ws.OPEN)
		{
			ws.close(1012, "No heartbeat acknowledgement received for " + timeoutTime/1000 + " seconds");
			log("No heartbeat acknowledgement received for " + timeoutTime/1000 + " seconds");
			clearInterval(heartbeatTimer);
			clearInterval(updateGameTimer);
			log("Reconnecting...");
			connect(true);
		}
	}
}


function connect(resume)
{
	var ws = new WebSocket(gateway);
	log("Attempting connection...");
	var heartbeatInterval;
	
	channels = JSON.parse(fs.readFileSync("./channels.json").toString());
	
	ws.onopen = function(ev) {
		log("Connection opened");
	};
	
	ws.onclose = function(ev) {
		log("Connection closed", ev.code,ev.reason);
		
		if(ev.code != 1012)
		{
			if(ws.readyState == ws.CLOSED)
			{
				clearInterval(heartbeatTimer);
				clearInterval(updateGameTimer);
				log("Reconnecting...");
				setTimeout(()=>connect(true), 5000);
			}
		}
		else
		{
			log("Not triggering reconnect")
		}
	};
	ws.onerror = function(ev) {
		log("Websocket Error: ", ev);
	};
	ws.onmessage = function(ev) {
		var message = ev.data;
		var parsed = JSON.parse(message);
		log(parsed.op, parsed.s, parsed.t);
		//log(parsed);
		if(parsed.op === 9)
		{
			log("Invalid session, restarting connection in 8 seconds");
			clearInterval(heartbeatTimer);
			clearInterval(updateGameTimer);
			setTimeout(()=>connect(false), 8000);
		}
		else if(parsed.op === 10)
		{
			log(parsed);
			heartbeatInterval = parsed.d.heartbeat_interval;
			heartbeatTimer = setInterval(function() {
				sendHeartbeat(ws, heartbeatInterval);
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
							"$browser": "QuoteBot",
							"$device": "QuoteBot",
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
					commandList += "\n\nAdd a :hash: react to quote a message";

					dr.sendMessage("Here you go <@" + message.author.id + ">\n" + commandList + "", 
									message.channel_id);
				}
				else if(message.content == prefix + "here")
				{
					checkRoles(0x00000008, message.channel_id, message.author.id, channel.guild_id)
						.then(result => {
							if(result)
							{
								checkChannel(message);
								channels[message.channel_id].enabled = true;
								syncChannels();
								dr.sendMessage("Now doing things in this channel :stuck_out_tongue:", message.channel_id);
								return true;
							}
					});
				}
				else if(message.content == prefix + "nohere")
				{
					checkRoles(0x00000008, message.channel_id, message.author.id, channel.guild_id)
						.then(result => {
							if(result)
							{
								checkChannel(message);
								channels[message.channel_id].enabled = false;
								syncChannels();
								dr.sendMessage("No longer doing things in this channel :sob:", message.channel_id);
								return true;
							}
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
						dr.getMessage(messageData.message_id, messageData.channel_id, msg => {
							dr.getChannel(messageData.channel_id, channel => {
								dr.getGuildUser(msg.author.id, channel.guild_id, quotedUser => {
									dr.getGuildUser(messageData.user_id, channel.guild_id, quotingUser => {
										log(messageData.user_id + " quoted " + quotedUser.user.id + ": " + messageData.message_id);
										
										var d = ()=>(Math.floor(Math.random()*256)).toString(16);
										var s = "0x"+d()+d()+d();
										var m = "";
										if(channels[messageData.channel_id].mention)
											m = "<@!" + messageData.user_id + "> quoted <@!" + quotedUser.user.id + ">:";
										else if(!channels[messageData.channel_id].mention)
											m = "**" + (quotingUser.nick || quotingUser.user.username) + "** quoted **" + (quotedUser.nick || quotedUser.user.username) + "**:";
										
										var re = new RegExp("https?:\/\/[^ \n]+\.(jpg|png)", "i");
										
										var embed = {
											"color": parseInt(s),
											"timestamp": msg.timestamp,
											"author": {
												"name": quotedUser.nick || quotedUser.user.username,
												"icon_url": quotedUser.user.avatar && "https://cdn.discordapp.com/avatars/" + quotedUser.user.id + "/" + quotedUser.user.avatar + ".png",
											},
											"description": msg.content,
										};
										var img = re.exec(msg.content);
										if(img !== null)
										{
											embed["image"] = {
													"url":re.exec(msg.content)[0]
												};
										}
										else
										{
											msg.attachments.some(v => {
												var im = re.exec(v.url);
												if(im !== null)
												{
													embed["image"] = {
															"url":im[0]
														};
												}
												else
												{
													embed["description"] += "\n\n";
													embed["description"] += "**Attachment**: [";
													embed["description"] += v.filename + "](" + v.url + ")";
												}
											});
										}
										
										sendMessage(m, messageData.channel_id, embed);
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
{
	try {
		start();
	} catch(e) {
		fs.writeFileSync((new Date().getTime()) + "_crash.err", JSON.stringify(e));
	}
}
else
{
	log("No bot token provided");
}