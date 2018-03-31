const fs = require("fs-extra");
const dr = require("./discordRequests.js");
const log = require("./log.js");
const { files } = require("./config/config.js");

let channels;
async function loadChannels()
{
	const file = await fs.readFile(files.channels, "utf8")
		.catch(err => log(err));
	channels = JSON.parse(file.toString());
}
function writeChannels()
{
	return fs.writeFile(files.channels, JSON.stringify(channels,null,4))
		.catch(err => log(err));
}
function registerChannel(message)
{
	if(!channels.hasOwnProperty(message.channel_id))
	{
		channels[message.channel_id] = {enabled:false, mention:false};
		log("Adding channel " + message.channel_id);
	}
}
function getChannels()
{
	return channels;
}

function isEnabled(channelId)
{
	return channels[channelId].enabled;
}
function setEnabled(channelId, en)
{
	channels[channelId].enabled = en;
}
function isMentionEnabled(channelId)
{
	return channels[channelId].mention;
}

async function checkHasRoles(roleMask, channel_id, author_id)
{
	const channel = await dr.getChannel(channel_id);
	const user = await dr.getGuildUser(author_id, channel.guild_id);
	const roles = await dr.getGuildRoles(channel.guild_id);

	const rids = user.roles;
	return roles.filter(v => rids.includes(v.id)).some(v=>{
		const p = v.permissions & roleMask;
		return p > 0;
	});
}

const commands = {
	anywhere: {
		here: {
			text: "Tell the bot to watch for commands in this channel.",
			func: async (messageData) => {
				const result = await checkHasRoles(0x00000008, messageData.channel_id, messageData.author.id);
				console.log(result);

				if(result)
				{
					registerChannel(messageData);
					setEnabled(messageData.channel_id, true);
					writeChannels();
					dr.sendMessage("Now doing things in this channel :stuck_out_tongue:", messageData.channel_id);
				}
			}
		}
	},
	enabled: {
		nohere: {
			text: "Tell the bot to stop watching for commands in this channel.",
			func: async (messageData) => {
				const result = await checkHasRoles(0x00000008, messageData.channel_id, messageData.author.id);

				if(result)
				{
					registerChannel(messageData);
					setEnabled(messageData.channel_id, false);
					writeChannels();
					dr.sendMessage("No longer doing things in this channel :sob:", messageData.channel_id);
				}
			}
		}
	}
};

module.exports = {
	commands,
	getChannels,
	loadChannels,
	writeChannels,
	registerChannel,
	isEnabled,
	setEnabled,
	isMentionEnabled
};