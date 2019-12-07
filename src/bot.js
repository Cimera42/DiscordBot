const { bot_token, prefix, game } = require("./config/config.js");

const log = require("./log.js");
const dr = require("./discordRequests.js");

const WebSocket = require("ws");

const fortune = require("./8ball.js");
const channelOps = require("./channelOps.js");

let gatewayURL;
let lastHeartbeatAck;
let heartbeatTimer;
let updateGameTimer;
let lastWebsocketSequence = null;
let websocketSessionId = null;
let heartbeatInterval;

const commands = {
	anywhere: {
		help: {
			text: "Show this text",
			func: helpCommand,
		},
		...channelOps.commands.anywhere
	},
	enabled: {
		...channelOps.commands.enabled,
		...fortune.commands
	}
};

async function doCommand(commandPrefix, commandList, messageData)
{
	let funcName = Object.keys(commandList).find(v => {
		return messageData.content.startsWith(commandPrefix + v);
	});
	if(funcName)
	{
		commandList[funcName].func(messageData);
	}
}

async function helpCommand(messageData)
{
	let d = ()=>(Math.floor(Math.random()*256)).toString(16);
	let s = "0x"+d()+d()+d();

	let commandEmbed = {
		title: "Commands",
		description: "Add a :hash: react to quote a message",
		color: parseInt(s),
		fields: []
	};
	const listCommands = (list) => {
		Object.keys(list).forEach(v => {
			if(v && list[v].text.length)
				commandEmbed.fields.push({
					name: v,
					value: list[v].text
				});
		});
	};
	listCommands(commands.anywhere);
	listCommands(commands.enabled);

	dr.sendMessage("Here you go <@" + messageData.author.id + ">",
		messageData.channel_id, commandEmbed);
}

async function start()
{
	const body = await dr.getGateway();

	console.log(body);
	gatewayURL = body.url + "/?v=6&encoding=json";

	connect(false);
}

function updateGame(ws, game)
{
	ws.send(JSON.stringify({
		"op": 3,
		"d": {
			"since": null,
			"status": "online",
			"afk": false,
			"game": {
				"name": game || "No Game",
			}
		}
	}));
}

function sendHeartbeat(ws, interval)
{
	log("HEARTBEAT SENT", lastWebsocketSequence);
	const heartbeatPackage = JSON.stringify({
		"op": 1,
		"d": lastWebsocketSequence
	});
	ws.send(heartbeatPackage);
	let timeoutTime = interval*(1/2);
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

async function connect(resume)
{
	let ws = new WebSocket(gatewayURL);
	log("Attempting connection...");

	await channelOps.loadChannels();
	await fortune.loadResponses();

	ws.onopen = onOpen;
	ws.onclose = onClose.bind(null, ws);
	ws.onerror = onError;
	ws.onmessage = onMessage.bind(null, ws, resume);
}

function onOpen()
{
	log("Connection opened");
	lastHeartbeatAck = new Date();
}

function onClose(ws, ev)
{
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
		log("Not triggering reconnect");
	}
}

function onError(ev)
{
	log("Websocket Error: ", ev);
}

async function onMessage(ws, resume, ev)
{
	const eventData = ev.data;
	const parsed = JSON.parse(eventData);
	log(parsed.op, parsed.s, parsed.t);

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
			ws.send(JSON.stringify({
				"op": 6,
				"d": {
					"token": bot_token,
					"session_id": websocketSessionId,
					"seq": lastWebsocketSequence
				}
			}));
		}
		else
		{
			ws.send(JSON.stringify({
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
			}));
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

			if(heartbeatInterval)
			{
				updateGame(ws, game);
				updateGameTimer = setInterval(() => updateGame(ws, game), heartbeatInterval*10);
			}
		}
		else if(parsed.t == "MESSAGE_CREATE")
		{
			const messageData = parsed.d;
			channelOps.registerChannel(messageData);

			if(messageData.content.startsWith(prefix))
			{
				doCommand(prefix, commands.anywhere, messageData);
				if(channelOps.isEnabled(messageData.channel_id))
					doCommand(prefix, commands.enabled, messageData);
			}
		}
		else if(parsed.t == "MESSAGE_REACTION_ADD")
		{
			const messageData = parsed.d;
			channelOps.registerChannel(messageData);
			if(channelOps.isEnabled(messageData.channel_id))
			{
				if(messageData.emoji.name.includes("#"))
				{
					const quotedMsg = await dr.getMessage(messageData.message_id, messageData.channel_id);
					const channel = await dr.getChannel(messageData.channel_id);
					const quotedUser = await dr.getGuildUser(quotedMsg.author.id, channel.guild_id);
					const quotingUser = await dr.getGuildUser(messageData.user_id, channel.guild_id);

					log(messageData.user_id + " quoted " + quotedUser.user.id + ": " + messageData.message_id);

					const d = ()=>(Math.floor(Math.random()*256)).toString(16);
					const s = "0x"+d()+d()+d();
					let m = "";
					if(channelOps.isMentionEnabled(messageData.channel_id))
						m = "<@!" + messageData.user_id + "> quoted <@!" + quotedUser.user.id + ">:";
					else
						m = "**" + (quotingUser.nick || quotingUser.user.username) + "** quoted **" + (quotedUser.nick || quotedUser.user.username) + "**:";

					const re = /https?:\/\/[^\s]+\.(jpg|png)/i;

					let embed = {
						color: parseInt(s),
						timestamp: quotedMsg.timestamp,
						author: {
							name: quotedUser.nick || quotedUser.user.username,
							icon_url: quotedUser.user.avatar && "https://cdn.discordapp.com/avatars/" + quotedUser.user.id + "/" + quotedUser.user.avatar + ".png",
						},
						description: quotedMsg.content + `\n[*Link*](https://discordapp.com/channels/${messageData.guild_id}/${messageData.channel_id}/${messageData.message_id})`,
					};
					const img = re.exec(quotedMsg.content);
					if(img !== null)
					{
						embed.image = {
							"url":re.exec(quotedMsg.content)[0]
						};
					}
					else
					{
						quotedMsg.attachments.some(v => {
							const im = re.exec(v.url);
							if(im !== null)
							{
								embed.image = {
									"url":im[0]
								};
							}
							else
							{
								embed.description += "\n\n";
								embed.description += "**Attachment**: [";
								embed.description += v.filename + "](" + v.url + ")";
							}
						});
					}

					dr.sendMessage(m, messageData.channel_id, embed);
					dr.deleteReact(channel.id, messageData.message_id, "%23%EF%B8%8F%E2%83%A3", messageData.user_id);
				}
			}
		}
	}
}

if(bot_token)
{
	start();
}
else
{
	log("No bot token provided");
}
