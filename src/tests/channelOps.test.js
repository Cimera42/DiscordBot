const channelOps = require("../channelOps.js");
const { files } = require("../config/config.js");
const fs = require("fs-extra");

beforeAll(() => {
	fs.writeFile(files.channels, "{}");
});

test("starts with no channels", async () => {
	await channelOps.loadChannels();
	expect(channelOps.getChannels()).toEqual({});
});

test("registers a channel", () => {
	channelOps.registerChannel({channel_id: "1234"});
	expect(channelOps.getChannels()).toEqual({
		"1234": {
			enabled:false, 
			mention:false
		}
	});
});

test("enables a channel", () => {
	channelOps.setEnabled("1234", true);
	expect(channelOps.isEnabled("1234")).toBe(true);
});

test("disables a channel", () => {
	channelOps.setEnabled("1234", false);
	expect(channelOps.isEnabled("1234")).toBe(false);
});

test("writes channels", async () => {
	await channelOps.writeChannels();
	await channelOps.loadChannels();
	expect(channelOps.getChannels()).toEqual({
		"1234": {
			enabled:false, 
			mention:false
		}
	});
});