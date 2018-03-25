const fs = require("fs");
const dr = require("./discordRequests.js");
const log = require("./log.js");

let responses;
function loadResponses()
{
	responses = JSON.parse(fs.readFileSync("./responses.json").toString());
}
function writeResponses()
{
	fs.writeFile("./responses.json", JSON.stringify(responses,null,4), err => {
		if(err) 
			log(err);
	});
}

const commands = {
	addResponse: {
		text: "Add response to 8ball command",
		func: async (messageData) => {
			let newResponse = messageData.content.replace(/^.addResponse +/,"");
			newResponse.trim();
			if(newResponse.length >= 1)
			{
				responses.push(newResponse);
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
			let list = "";
			responses.forEach(v => list += v + "\n");
			dr.sendMessage(list, messageData.channel_id);
		}
	}
};

module.exports = {
	commands,
	loadResponses,
	writeResponses
};