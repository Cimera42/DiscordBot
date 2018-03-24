const request = require("request-promise");
const log = require("./log.js");

const api = "https://discordapp.com/api";
const { bot_token } = require("./config.json");

const standardOptions = {
	headers: {
		"Authorization": "Bot " + bot_token
	},
	json:true
};

function createOptions(method, url, body)
{
	return {
		...standardOptions,
		method,
		url: api + url,
		body
	}
}

module.exports.getGateway = () => {
	const options = createOptions(
		"GET",
		"/gateway/bot"
	);
	return request(options).catch(err => {
		log("Error getGateway: " + err);
	});
}

module.exports.sendMessage = (messageContent, channel, embed) => {
	const options = createOptions(
		"POST",
		"/channels/" + channel + "/messages",
		{
			"content": messageContent,
			"embed": embed
		}
	);
	return request(options).catch(err => {
		log("Error sendMessage: " + err);
	});
}

module.exports.getMessage = (messageId, channel) => {
	const options = createOptions(
		"GET",
		"/channels/" + channel + "/messages/" + messageId
	);
	return request(options).catch(err => {
		log("Error getMessage: " + err);
	});
}

module.exports.getGuildUser = (userId, guildId) => {
	const options = createOptions(
		"GET",
		"/guilds/" + guildId + "/members/" + userId
	);
	return request(options).catch(err => {
		log("Error getGuildUser: " + err);
	});
}

module.exports.getGuildRoles = (guildId) => {
	const options = createOptions(
		"GET",
		"/guilds/" + guildId + "/roles"
	);
	return request(options).catch(err => {
		log("Error getGuildRoles: " + err);
	});
}

module.exports.getChannel = (channelId) => {
	const options = createOptions(
		"GET",
		"/channels/" + channelId
	);
	return request(options).catch(err => {
		log("Error getChannel: " + err);
	});
}

module.exports.deleteReact = (channelId, messageId, emoji, userId) => {
	const options = createOptions(
		"DELETE",
		"/channels/" + channelId + "/messages/" + messageId + "/reactions/" + emoji + "/" + userId
	);
	return request(options).catch(err => {
		log("Error deleteReact: " + err);
	});
}