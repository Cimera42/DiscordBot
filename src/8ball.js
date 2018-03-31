const fs = require("fs-extra");
const dr = require("./discordRequests.js");
const log = require("./log.js");
const { files } = require("./config/config.js");

let responses;
async function loadResponses()
{
	const file = await fs.readFile(files.responses, "utf8");
	responses = JSON.parse(file.toString());
}
function writeResponses()
{
	return fs.writeFile(files.responses, JSON.stringify(responses,null,4))
		.catch(err => log(err));
}

function getResponses()
{
	return responses;
}
function addResponse(newResponse)
{
	responses.push(newResponse);
}
function listResponses()
{
	let list = "";
	responses.forEach((v,i) => {
		if(i !== 0)
			list += "\n";
		list += v;
	});
	return list;
}

const commands = {
	addResponse: {
		text: "Add response to 8ball command",
		func: async (messageData) => {
			let newResponse = messageData.content.replace(/^.addResponse +/,"");
			newResponse.trim();
			if(newResponse.length >= 1)
			{
				addResponse(newResponse);
				writeResponses();
				dr.sendMessage("Added `" + newResponse + "`", messageData.channel_id);
			}
		}
	},
	yesno: {
		text: "Ask 8ball a question",
		func: async (messageData) => {
			let n = responses.length;
			let r = Math.floor(Math.random()*n);
			dr.sendMessage("<@" + messageData.author.id + ">: " + responses[r], messageData.channel_id);
		}
	},
	responseList: {
		text: "List 8ball responses",
		func: async (messageData) => {
			const list = listResponses();
			dr.sendMessage(list, messageData.channel_id);
		}
	}
};

module.exports = {
	commands,
	loadResponses,
	writeResponses,
	getResponses,
	addResponse,
	listResponses
};