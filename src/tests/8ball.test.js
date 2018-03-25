const fortune = require("../8ball.js");
const { files } = require("../config.js");
const fs = require("fs-extra");

beforeAll(() => {
	fs.writeFile(files.responses, "[]");
});

test("starts with no responses", async () => {
	await fortune.loadResponses();
	expect(fortune.getResponses()).toEqual([]);
});

test("adds a response", () => {
	fortune.addResponse("yes");
	expect(fortune.getResponses()).toEqual([
		"yes"
	]);
});

test("adds another response", () => {
	fortune.addResponse("no");
	expect(fortune.getResponses()).toEqual([
		"yes",
		"no"
	]);
});

test("lists all responses", () => {
	expect(fortune.listResponses()).toBe("yes\nno");
});

test("writes responses", async () => {
	await fortune.writeResponses();
	await fortune.loadResponses();
	expect(fortune.getResponses()).toEqual([
		"yes",
		"no"
	]);
});