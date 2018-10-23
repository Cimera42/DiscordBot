const fs = require("fs-extra");
const dr = require("./discordRequests.js");
const log = require("./log.js");
const { files, rythmLogger } = require("./config/config.js");

let songList;
async function loadSongs()
{
	const file = await fs.readFile(files.songs, "utf8");
	songList = JSON.parse(file.toString());
}

async function writeSongs()
{
	return fs.writeFile(files.songs, JSON.stringify(songList,null,4))
		.catch(err => log(err));
}

function getSongs()
{
	return songList;
}

function addSong(newSong)
{
	songList.push(newSong);
}

function listSongs()
{
	return songList.join("\n");
}

const commands = {
	random: {
		text: "Play a random song from the song list",
		func: async (messageData) => {
			let index = Math.floor(Math.random() * songList.length);
			if(songList[index])
			{
				dr.sendMessage(`${rythmLogger.prefix}play ${songList[index]}`, messageData.channel_id);
			}
		}
	},
	songlist: {
		text: "List all songs in the song list",
		func: async (messageData) => {
			const d = ()=>(Math.floor(Math.random()*256)).toString(16);
			const s = "0x"+d()+d()+d();

			const embed = {
				color: parseInt(s),
				timestamp: messageData.timestamp,
				description: listSongs(),
			};
			dr.sendMessage(`Here you go <@${messageData.author.id}>:`, messageData.channel_id, embed);
		}
	},
	addSong: {
		text: "Manually add a song to the song list",
		func: async (messageData) => {
			let toAdd = messageData.content.replace(/^.addSong +/,"");
			toAdd.trim();
			if(toAdd.length >= 1)
			{
				addSong(toAdd);
				writeSongs();
				dr.sendMessage("Added `" + toAdd + "` to the song list", messageData.channel_id);
			}
		}
	}
};

module.exports = {
	commands,
	loadSongs,
	writeSongs,
	getSongs,
	addSong,
	listSongs
};