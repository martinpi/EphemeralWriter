import { ephemeral } from "../src/ephemeral";

const testGram = `
[heister]
Alice O'Rourke
Frank Diob
Jimmy Tartufi
Winnie He

[origin]
[crew1:#heister#][crew2:#heister#]At dawn, #crew1# and #crew2# got ready for the biggest heist in their lives. #crew2# was nervous.
`;

export const testGrammar = (text: string) => {
	const grammar = ephemeral.createGrammar(text);
	grammar.addModifiers(ephemeral.baseEngModifiers);
	let result = grammar.expand("#origin#", false, { c: "Hello" });
	return result.finishedText || "Failed to expand grammar";
}

