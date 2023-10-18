import ephemeral from "ephemeral-writer";

let text = "bla bla bla"

let grammar = ephemeral.createGrammar(text)
grammar.addModifiers(ephemeral.baseEngModifiers);
let result1 = grammar.flatten("#origin#", false, { c: "Hello" })
let result2 = grammar.expand("#origin#", false, { c: "Hello" })