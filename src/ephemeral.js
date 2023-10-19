/**
 * @author pi
 * Original @author Kate
 */

// /**
//  * @typedef {Object} EphemeralObject
// * @property {(Record<string, string | string[]> | string) => Grammar} createGrammar 
// * @property {(string | null) => { symbol: Symbol | undefined; modifiers: string[]; preactions: NodeAction[]; postactions: NodeAction[] }} parseTag 
// * @property {(string | null) => { type: number, raw: string }[]} parse
//  */

export var ephemeral = function () {
	/**
	 * @type { () => number } rng
	 */
	var rng = Math.random;

	/**
	 * Description
	 * @param {() => number} newRng
	 * @returns {void}
	 */
	var setRng = function setRng(newRng) {
		rng = newRng;
	};

	/**
	 * Description
	 * @constructor
	 * @param {EphemeralNode | null} parent
	 * @param {Grammar} grammar
	 * @param {number} childIndex
	 * @param {{ raw: string, scratch: Record<string, string | undefined> | undefined, type: number }} settings
	 */
	var EphemeralNode = function (parent, grammar, childIndex, settings) {
		/** @type {string[]} */
		this.errors = [];
		/** @type {number} */
		this.depth = 0;
		/** @type {number} */
		this.childIndex = 0;
		/** @type {Record<string, string | undefined>} */
		this.scratch = settings.scratch === undefined ? {} : settings.scratch;
		/** @type {Grammar} */
		this.grammar = grammar;
		/** @type {EphemeralNode | null} */
		this.parent = null;
		/** @type {EphemeralNode[]} */
		this.children = [];
		/** @type {string} */
		this.finishedText = "";

		// No input? Add an error, but continue anyways
		if (settings.raw === undefined) {
			this.errors.push("Empty input for node");
			settings.raw = "";
		}

		if (parent) {
			/** @type {EphemeralNode | null} */
			this.parent = parent;
			/** @type {number} */
			this.depth = parent.depth + 1;
			/** @type {number} */
			this.childIndex = childIndex;
			/** @type {Record<string, string | undefined>} */
			this.scratch = parent.scratch;
		}

		/** @type {string} */
		this.raw = settings.raw;
		/** @type {number} */
		this.type = settings.type;
		/** @type {boolean} */
		this.isExpanded = false;

		if (!this.grammar) {
			console.warn("No grammar specified for this node", this);
		}

	};

	/**
	 * Description
	 * @returns {string}
	 */
	EphemeralNode.prototype.toString = function () {
		return "Node('" + this.raw + "' " + this.type + " d:" + this.depth + ")";
	};

	/**
	 * Expand the node (with the given child rule). Make children if the node has any.
	 * @param {string} childRule
	 * @param {boolean} preventRecursion
	 * @returns {void}
	 */
	EphemeralNode.prototype.expandChildren = function (childRule, preventRecursion) {
		// Set the rule for making children,
		// and expand it into section
		/** @type {string} */
		this.childRule = childRule;
		if (this.childRule !== undefined) {
			var { sections, errors } = ephemeral.parse(childRule);

			// Add errors to this
			if (errors.length > 0) {
				this.errors = this.errors.concat(errors);

			}

			for (var i = 0; i < sections.length; i++) {
				this.children[i] = new EphemeralNode(this, this.grammar, i, sections[i]);
				if (!preventRecursion)
					this.children[i].expand(preventRecursion);

				// Add in the finished text
				this.finishedText += this.children[i].finishedText;
			}
		} else {
			// In normal operation, this shouldn't ever happen
			this.errors.push("No child rule provided, can't expand children");
			console.warn("No child rule provided, can't expand children");
		}
	};

	/**
	 * Expand this rule (possibly creating children)
	 * @param {boolean} preventRecursion
	 * @returns {void}
	 */
	EphemeralNode.prototype.expand = function (preventRecursion) {

		if (!this.isExpanded) {
			this.isExpanded = true;

			/** @type {string[]} */
			this.expansionErrors = [];

			// Types of nodes
			// -1: raw, needs parsing
			//  0: Plaintext
			//  1: Tag ("#symbol.mod.mod2.mod3#" or "#[pushTarget:pushRule]symbol.mod")
			//  2: Action ("[pushTarget:pushRule], [pushTarget:POP]", more in the future)
			//  3: Set/get variable

			switch (this.type) {
				// Raw rule
				case -1:

					this.expandChildren(this.raw, preventRecursion);
					break;

				// plaintext, do nothing but copy text into finsihed text
				case 0:
					this.finishedText = this.raw;
					break;

				// Tag
				case 1:
					// Parse to find any actions, and figure out what the symbol is
					/** @type {NodeAction[]} */
					this.preactions = [];
					/** @type {NodeAction[]} */
					this.postactions = [];

					var parsed = ephemeral.parseTag(this.raw);

					// Break into symbol actions and modifiers
					this.symbol = parsed.symbol;
					this.modifiers = parsed.modifiers;

					// Create all the preactions from the raw syntax
					for (var i = 0; i < parsed.preactions.length; i++) {
						this.preactions[i] = new NodeAction(this, parsed.preactions[i].raw);
					}
					for (var i = 0; i < parsed.postactions.length; i++) {
						//   this.postactions[i] = new NodeAction(this, parsed.postactions[i].raw);
					}

					// Make undo actions for all preactions (pops for each push)
					for (var i = 0; i < this.preactions.length; i++) {
						if (this.preactions[i].type === 0) {
							const undoAction = this.preactions[i].createUndo();
							if (undoAction) this.postactions.push(undoAction);
						}
					}

					// Activate all the preactions
					for (var i = 0; i < this.preactions.length; i++) {
						this.preactions[i].activate();
					}

					this.finishedText = this.raw;

					// Expand (passing the node, this allows tracking of recursion depth)

					var selectedRule = this.grammar.selectRule(this.symbol, this, this.errors);

					this.expandChildren(selectedRule, preventRecursion);

					// Apply modifiers
					// TODO: Update parse function to not trigger on hashtags within parenthesis within tags,
					//   so that modifier parameters can contain tags "#story.replace(#protagonist#, #newCharacter#)#"
					for (var i = 0; i < this.modifiers.length; i++) {
						var modName = this.modifiers[i];
						/** @type {string[]} */
						var modParams = [];
						if (modName.indexOf("(") > 0) {
							var regExp = /\(([^)]+)\)/;

							// Todo: ignore any escaped commas.  For now, commas always split
							var results = regExp.exec(this.modifiers[i]);
							if (!results || results.length < 2) {
							} else {
								var modParams = results[1].split(",");
								modName = this.modifiers[i].substring(0, modName.indexOf("("));
							}

						}

						var mod = this.grammar.modifiers[modName];

						// Missing modifier?
						if (!mod) {
							this.errors.push("Missing modifier " + modName);
							this.finishedText += "((." + modName + "))";
						} else {
							this.finishedText = mod(this.finishedText, modParams);

						}

					}

					// Perform post-actions
					for (var i = 0; i < this.postactions.length; i++) {
						this.postactions[i].activate();
					}
					break;
				case 2:

					// Just a bare action?  Expand it!
					this.action = new NodeAction(this, this.raw);
					this.action.activate();

					// No visible text for an action
					// TODO: some visible text for if there is a failure to perform the action?
					this.finishedText = "";
					break;

				case 3:
					this.varop = new NodeVariableOp(this, this.raw);
					this.varop.activate();

					switch (this.varop.type) {
						case 0:
							this.finishedText = this.scratch[this.varop.target] || "";
							break;
						default:
						case 1:
							this.finishedText = "";
							break;
						case 2:
							// conditional
							const condition = this.scratch[this.varop.target] == this.varop.value && this.varop.value !== undefined;

							if (this.varop.conditional && condition) {
								// console.log("Parsing conditional")

								// Parse to find any actions, and figure out what the symbol is
								/** @type {NodeAction[]} */
								this.preactions = [];
								/** @type {NodeAction[]} */
								this.postactions = [];

								// var parsed = ephemeral.parseTag(this.varop.conditional);

								/** @type {{ symbol: Symbol | undefined; modifiers: string[]; preactions: NodeAction[]; postactions: NodeAction[]; }} */
								var reparsed = {
									symbol: undefined,
									modifiers: [],
									preactions: [],
									postactions: [],
								};
								var { sections, errors } = ephemeral.parse(this.varop.conditional);
								var symbolSection = undefined;
								for (var i = 0; i < sections.length; i++) {
									if (sections[i].type === 0) {
										if (symbolSection === undefined) {
											symbolSection = sections[i].raw;
										}
									} else {
										if (symbolSection === undefined) {
											symbolSection = sections[i].raw;
										}
									}
								}

								var components = symbolSection.split(".");
								reparsed.symbol = components[0];
								reparsed.modifiers = components.slice(1);


								// console.info(reparsed)

								// Break into symbol actions and modifiers
								this.symbol = reparsed.symbol;
								this.modifiers = reparsed.modifiers;

								// Create all the preactions from the raw syntax
								for (var i = 0; i < reparsed.preactions.length; i++) {
									this.preactions[i] = new NodeAction(this, reparsed.preactions[i].raw);
								}
								for (var i = 0; i < reparsed.postactions.length; i++) {
									//   this.postactions[i] = new NodeAction(this, reparsed.postactions[i].raw);
								}

								// Make undo actions for all preactions (pops for each push)
								for (var i = 0; i < this.preactions.length; i++) {
									const undoAction = this.preactions[i].createUndo();
									if (undoAction) this.postactions.push(undoAction);
								}

								// Activate all the preactions
								for (var i = 0; i < this.preactions.length; i++) {
									this.preactions[i].activate();
								}

								this.finishedText = this.raw;

								// Expand (passing the node, this allows tracking of recursion depth)

								var selectedRule = this.grammar.selectRule(this.symbol, this, this.errors);

								if (selectedRule.startsWith("((")) {
									this.finishedText = this.symbol;
								} else {

									this.expandChildren(selectedRule, preventRecursion);

								}

								// Apply modifiers
								// TODO: Update parse function to not trigger on hashtags within parenthesis within tags,
								//   so that modifier parameters can contain tags "#story.replace(#protagonist#, #newCharacter#)#"
								for (var i = 0; i < this.modifiers.length; i++) {
									var modName = this.modifiers[i];
									/** @type {string[]} */
									var modParams = [];
									if (modName.indexOf("(") > 0) {
										var regExp = /\(([^)]+)\)/;

										// Todo: ignore any escaped commas.  For now, commas always split
										var results = regExp.exec(this.modifiers[i]);
										if (!results || results.length < 2) {
										} else {
											var modParams = results[1].split(",");
											modName = this.modifiers[i].substring(0, modName.indexOf("("));
										}
									}

									var mod = this.grammar.modifiers[modName];

									// Missing modifier?
									if (!mod) {
										this.errors.push("Missing modifier " + modName);
										this.finishedText += "((." + modName + "))";
									} else {
										this.finishedText = mod(this.finishedText, modParams);

									}

								}

								// Perform post-actions
								for (var i = 0; i < this.postactions.length; i++) {
									this.postactions[i].activate();
								}
							} else {
								// silently ignore if condition not met
								this.finishedText = "";
							}
							break;
					}
					break;

			}

		} else {
			//console.warn("Already expanded " + this);
		}

	};

	/**
	 * Description
	 * @returns {void}
	 */
	EphemeralNode.prototype.clearEscapeChars = function () {

		this.finishedText = this.finishedText.replace(/\\\\/g, "DOUBLEBACKSLASH").replace(/\\/g, "").replace(/DOUBLEBACKSLASH/g, "\\");
	};


	/**
	 * Description
	 * @constructor
	 * @param {EphemeralNode} node
	 * @param {string} raw
	 */
	function NodeVariableOp(node, raw) {
		/** @type {EphemeralNode} */
		this.node = node;
		/** @type {Record<string, string | undefined>} */
		this.scratch = this.node.scratch;

		var comparision = raw.split("==");

		if (comparision.length == 2) {
			this.type = 2;
			this.target = comparision[0];

			var conditional = comparision[1].split("?");
			// we have a conditional
			if (conditional.length == 2) {
				this.value = conditional[0];
				this.conditional = conditional[1];
			}
			return;
		}

		var sections = raw.split("=");
		this.target = sections[0];

		if (sections.length === 1) {
			// No "=" means read operation
			this.type = 0;
		} else {
			// write operation
			this.type = 1;
			this.value = sections[1];
		}
	}

	/**
	 * Description
	 * @returns {void}
	 */
	NodeVariableOp.prototype.activate = function () {
		switch (this.type) {
			case 0:
				break;
			case 1:
				// console.log("Storing " + this.value + " in slot " + this.target + " in " + this.scratch)
				this.scratch[this.target] = this.value;
				break;
		}
	}

	/**
	   * An action that occurs when a node is expanded
	   * Types of actions:
	   * 0 Push: [key:rule]
	   * 1 Pop: [key:POP]
	   * 2 function: [functionName(param0,param1)] (TODO!)
	 * @constructor
	 * @param {EphemeralNode} node
	 * @param {string} raw
	 */
	function NodeAction(node, raw) {
		/*
		 if (!node)
		 console.warn("No node for NodeAction");
		 if (!raw)
		 console.warn("No raw commands for NodeAction");
		*/

		this.raw = raw;
		this.node = node;

		var sections = raw.split(":");
		this.target = sections[0];

		// No colon? A function!
		if (sections.length === 1) {
			this.type = 2;

		}

		// Colon? It's either a push or a pop
		else {
			this.rule = sections[1];
			if (this.rule === "POP") {
				this.type = 1;
			} else {
				this.type = 0;
			}
		}
	}


	/**
	 * Description
	 * @returns {NodeAction | null}
	 */
	NodeAction.prototype.createUndo = function () {
		if (this.type === 0) {
			return new NodeAction(this.node, this.target + ":POP");
		}
		// TODO Not sure how to make Undo actions for functions or POPs
		return null;
	};

	/**
	 * Description
	 * @returns {void}
	 */
	NodeAction.prototype.activate = function () {
		var grammar = this.node.grammar;
		switch (this.type) {
			case 0:
				// split into sections (the way to denote an array of rules)
				this.ruleSections = this.rule?.split(",");
				/** @type {string[]} */
				this.finishedRules = [];
				// /** @type {EphemeralNode[]} */
				// this.ruleNodes = [];
				if (this.ruleSections) {
					for (var i = 0; i < this.ruleSections.length; i++) {
						// we make parent-less temporary nodes here
						var n = new EphemeralNode(null, grammar, 0, {
							type: -1,
							raw: this.ruleSections[i],
							scratch: this.node.scratch,
						});

						n.expand(false);
						this.finishedRules.push(n.finishedText);
					}
				}

				// TODO: escape commas properly
				grammar.pushRules(this.target, this.finishedRules, this);
				break;
			case 1:
				grammar.popRules(this.target);
				break;
			case 2:
				grammar.flatten(this.target, true, this.node.scratch);
				break;
			case 3:
				console.log("Should set variable value?")
				break;
		}

	};

	/**
	 * Description
	 * @returns {string}
	 */
	NodeAction.prototype.toText = function () {
		switch (this.type) {
			case 0:
				return this.target + ":" + this.rule;
			case 1:
				return this.target + ":POP";
			case 2:
				return "((some function))";
			default:
				return "((unknown action))";
		}
	};

	/**
	 * Sets of rules. Can also contain conditional or fallback sets of rulesets.
	 * @constructor
	 * @param {Grammar} grammar
	 * @param {string | string[] | undefined} raw
	 */
	function RuleSet(grammar, raw) {
		/** @type {string | string[] | undefined} */
		this.raw = raw;
		/** @type {Grammar} */
		this.grammar = grammar;
		/** @type {number} */
		this.falloff = 1;
		/** @type {string[] | undefined} */
		this.defaultRules = [];
		/** @type {string | undefined} */
		this.conditionalRule = undefined;
		/** @type {number} */
		this.lastIndex = -1;

		if (Array.isArray(raw)) {
			this.defaultRules = raw;
		} else if (typeof raw === 'string') { // || raw instanceof String) {
			this.defaultRules = [raw];
		}
	};

	/**
	 * Description
	 * @param {string[]} errors
	 * @returns {string | null}
	 */
	RuleSet.prototype.selectRule = function (errors) {

		if (this.defaultRules !== undefined) {
			// Select from this basic array of rules
			var index = Math.floor(Math.pow(rng(), this.falloff) * this.defaultRules.length);

			while (this.defaultRules.length > 0 && index == this.lastIndex) {
				// search for first index that is not lastIndex
				++index;
				index %= this.defaultRules.length;
			}

			this.lastIndex = index;
			return this.defaultRules[index];
		}

		errors.push("No default rules defined for " + this);
		return null;

	};

	/**
	 * Description
	 * @returns {void}
	 */
	RuleSet.prototype.clearState = function () {
		this.lastIndex = -1;
	};

	/**
	 * Description
	 * @constructor
	 * @param {Grammar} grammar
	 * @param {string} key
	 * @param {string | string[] | undefined} rawRules
	 */
	var Symbol = function (grammar, key, rawRules) {
		// Symbols can be made with a single value, and array, or array of objects of (conditions/values)
		/** @type {string} */
		this.key = key;
		/** @type {Grammar} */
		this.grammar = grammar;
		/** @type {string | string[] | undefined} */
		this.rawRules = rawRules;

		/** @type {RuleSet} */
		this.baseRules = new RuleSet(this.grammar, rawRules);

		/** @type {RuleSet[]} */
		this.stack = [this.baseRules];

		/** @type {{node: EphemeralNode}[]} */
		this.uses = [];

		/** @type {boolean} */
		this.isDynamic = false;

		this.clearState();
	};

	/**
	 * Description
	 * @returns {void}
	 */
	Symbol.prototype.clearState = function () {

		// Clear the stack and clear all ruleset usages
		this.stack = [this.baseRules];
		this.uses = [];
		this.baseRules.clearState();
	};

	/**
	 * Description
	 * @param {string | string[] | undefined} rawRules
	 * @returns {void}
	 */
	Symbol.prototype.pushRules = function (rawRules) {
		var rules = new RuleSet(this.grammar, rawRules);
		this.stack.push(rules);
	};

	/**
	 * Description
	 * @returns {void}
	 */
	Symbol.prototype.popRules = function () {
		this.stack.pop();
	};

	/**
	 * Description
	 * @param {EphemeralNode} node
	 * @param {string[]} errors
	 * @returns {any}
	 */
	Symbol.prototype.selectRule = function (node, errors) {
		this.uses.push({
			node: node
		});

		if (this.stack.length === 0) {
			errors.push("The rule stack for '" + this.key + "' is empty, too many pops?");
			return "((empty stack: " + this.key + "))";
		}

		return this.stack[this.stack.length - 1].selectRule(errors);
	};

	/**
	 * Description
	 * @returns {any}
	 */
	Symbol.prototype.getActiveRules = function () {
		if (this.stack.length === 0) {
			return null;
		}
		return this.stack[this.stack.length - 1].selectRule([]);
	};

	/**
	 * Description
	 * @returns {string}
	 */
	Symbol.prototype.rulesToJSON = function () {
		return JSON.stringify(this.rawRules);
	};

	/**
	 * Make a grammar out of either a string of a JSON or an ephemeral text
	 * @constructor
	 * @param {Record<string, string | string[]>} raw
	 */
	var Grammar = function (raw) {
		/** @type {Record<string, (s: string, params: string[]) => string>} */
		this.modifiers = {};
		/** @type {number} */
		this.depth = -1;
		/** @type {Object.<string, Symbol>} */
		this.symbols = {};
		/** @type {Grammar[]} */
		this.subgrammars = [];
		/** @type {string[]} */
		this.errors = [];
		/** @type {Record<string, string | string[]>} */
		this.raw = raw;

		if (this.raw) {
			// Add all rules to the grammar
			for (var key in this.raw) {
				if (this.raw.hasOwnProperty(key)) {
					this.symbols[key] = new Symbol(this, key, this.raw[key]);
				}
			}
		}
	};

	/**
	 * Description
	 * @returns {void}
	 */
	Grammar.prototype.clearState = function () {
		var keys = Object.keys(this.symbols);
		for (var i = 0; i < keys.length; i++) {
			if (this.symbols[keys[i]]) this.symbols[keys[i]].clearState();
		}
	};

	/**
	 * Description
	 * @param {Record<string, (s: string, params: string[]) => string>} mods
	 * @returns {void}
	 */
	Grammar.prototype.addModifiers = function (mods) {

		// copy over the base modifiers
		for (var key in mods) {
			if (mods.hasOwnProperty(key)) {
				this.modifiers[key] = mods[key];
			}
		};

	};

	/**
	 * Description
	 * @param {Record<string, (s: string, params: string[]) => string>} mods
	 * @returns {Grammar}
	 */
	Grammar.prototype.withModifiers = function (mods) {

		// copy over the base modifiers
		for (var key in mods) {
			if (mods.hasOwnProperty(key)) {
				this.modifiers[key] = mods[key];
			}
		};
		return this;

	};

	/**
	 * Description
	 * @param {string} rule
	 * @param {Record<string, string | undefined>} scratch
	 * @returns {EphemeralNode}
	 */
	Grammar.prototype.createRoot = function (rule, scratch) {
		// Create a node and subnodes
		var root = new EphemeralNode(null, this, 0, {
			type: -1,
			raw: rule,
			scratch: scratch,
		});

		return root;
	};

	/**
	 * Description
	 * @param {string} rule
	 * @param {boolean} allowEscapeChars
	 * @param {Record<string, string | undefined>} scratch
	 * @returns {EphemeralNode}
	 */
	Grammar.prototype.expand = function (rule, allowEscapeChars, scratch) {
		var root = this.createRoot(rule, scratch);
		root.expand(false);
		if (!allowEscapeChars)
			root.clearEscapeChars();

		return root;
	};

	/**
	 * Description
	 * @param {string} rule
	 * @param {boolean} allowEscapeChars
	 * @param {Record<string, string | undefined>} scratch
	 * @returns {string}
	 */
	Grammar.prototype.flatten = function (rule, allowEscapeChars, scratch) {
		var root = this.expand(rule, allowEscapeChars, scratch);

		return root.finishedText;
	};

	/**
	 * Description
	 * @returns {string}
	 */
	Grammar.prototype.toJSON = function () {
		var keys = Object.keys(this.symbols);
		var symbolJSON = [];
		for (var i = 0; i < keys.length; i++) {
			var key = keys[i];
			if (this.symbols && this.symbols[key]) symbolJSON.push(' "' + key + '" : ' + this.symbols[key].rulesToJSON());
		}
		return "{\n" + symbolJSON.join(",\n") + "\n}";
	};

	/**
	 * Create or push rules
	 * @param {string} key
	 * @param {ConstructorParameters<typeof Symbol>[2]} rawRules
	 * @param {NodeAction?} sourceAction
	 * @returns {void}
	 */
	Grammar.prototype.pushRules = function (key, rawRules, sourceAction) {

		if (this.symbols === undefined)
			this.symbols = {};

		if (this.symbols[key] === undefined) {
			this.symbols[key] = new Symbol(this, key, rawRules);
			if (sourceAction)
				this.symbols[key].isDynamic = true;
		} else {
			this.symbols[key].pushRules(rawRules);
		}
	};

	/**
	 * Description
	 * @param {string} key
	 * @returns {void}
	 */
	Grammar.prototype.popRules = function (key) {
		if (!this.symbols[key])
			this.errors.push("Can't pop: no symbol for key " + key);
		this.symbols[key].popRules();
	};

	/**
	 * Description
	 * @param {string} key
	 * @param {EphemeralNode} node
	 * @param {string[]} errors
	 * @returns {any}
	 */
	Grammar.prototype.selectRule = function (key, node, errors) {
		if (this.symbols[key]) {
			var rule = this.symbols[key].selectRule(node, errors);

			return rule;
		}

		// Failover to alternative subgrammars
		for (var i = 0; i < this.subgrammars.length; i++) {

			if (this.subgrammars[i].symbols[key])
				return this.subgrammars[i].symbols[key].selectRule(node, errors);
		}

		// No symbol?
		errors.push("No symbol for '" + key + "'");
		return "(( no symbol " + key + "))";
	};


	/**
	 * Description
	 * @param {string} text
	 * @returns {Record<string, string | string[]>}
	 */
	function string2json(text) {
		/** @type {Record<string, string | string[]>} */
		var rules = {}
		var symbol = ""
		var expansions = new Array()
		var asterisk = false;

		let lines = text.split('\n')
		lines.forEach(line => {
			let trimmed = line.trim()

			// skip comments
			if (trimmed.startsWith("\\\\")) return

			// skip empty lines unless in * mode
			if (trimmed.length == 0) {
				if (asterisk && expansions.length > 0)
					expansions[expansions.length - 1] += "\n"
				return
			}

			if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
				// we still got the old symbol stored
				if (symbol.length > 0) {
					// shave off last \n because a newline before the symbol is ok
					if (expansions[expansions.length - 1].endsWith("\n")) {
						expansions[expansions.length - 1] = expansions[expansions.length - 1].substring(0, expansions[expansions.length - 1].length - 1)
					}

					rules[symbol] = expansions
					expansions = new Array()
					asterisk = false;
				}
				symbol = trimmed.substring(1, trimmed.length - 1)
			} else {
				if (trimmed.startsWith("*")) {
					expansions.push(trimmed.substring(1).trim())
					asterisk = true
				} else {
					// append if we're in asterisk mode
					if (asterisk)
						expansions[expansions.length - 1] += "\n" + trimmed;
					else
						// we're neither in asterisk mode nor is this a new rule, so fall back to old behaviour
						expansions.push(trimmed)
				}
			}

			if (symbol.length > 0) {
				rules[symbol] = expansions
			}
		})
		return rules
	}


	// Parses a plaintext rule in the ephemeral syntax
	/**
	 * @constructor
	 */
	ephemeral = {
		/**
		 * Description
		 * @param {string} raw
		 * @returns {Grammar}
		 */
		createGrammar: function (raw) {

			/** @type {Record<string, string | string[]>} */
			var jsonData = raw.startsWith("{") ? JSON.parse(raw) : string2json(raw);

			return new Grammar(jsonData);
		},

		// Parse the contents of a tag
		/**
		 * Description
		 * @param {string | null} tagContents
		 * @returns {{ symbol: Symbol | undefined; modifiers: string[]; preactions: NodeAction[]; postactions: NodeAction[]; }}
		 */
		parseTag: function (tagContents) {

			/** @type {{ symbol: Symbol | undefined; modifiers: string[]; preactions: NodeAction[]; postactions: NodeAction[]; }} */
			var parsed = {
				symbol: undefined,
				preactions: [],
				postactions: [],
				modifiers: []
			};
			var { sections, errors } = ephemeral.parse(tagContents);
			var symbolSection = undefined;
			for (var i = 0; i < sections.length; i++) {
				if (sections[i].type === 0) {
					if (symbolSection === undefined) {
						symbolSection = sections[i].raw;
					} else {
						throw ("multiple main sections in " + tagContents);
					}
				} else {
					parsed.preactions.push(sections[i]);
				}
			}

			if (symbolSection === undefined) {
				//   throw ("no main section in " + tagContents);
			} else {
				var components = symbolSection.split(".");
				parsed.symbol = components[0];
				parsed.modifiers = components.slice(1);
			}
			return parsed;
		},

		/**
		 * Description
		 * @param {string | null} rule
		 * @returns {{ sections: {type: number; raw: string }[]; errors: string[]}}
		 */
		parse: function (rule) {
			var depth = 0;
			var inTag = false;
			var inVar = false;
			/** @type {{ type: number, raw: string }[]} */
			var sections = [];
			var escaped = false;

			/** @type {string[]} */
			var errors = [];
			var start = 0;

			var escapedSubstring = "";

			/** @type {number | undefined} */
			var lastEscapedChar = undefined;

			if (rule === null) {
				return { sections: sections, errors: errors };
			}

			/**
			 * @param {number} start
			 * @param {number} end
			 * @param {number} type
			 * @returns {void}
			 */
			function createSection(start, end, type) {
				if (end - start < 1) {
					if (type === 1)
						errors.push(start + ": empty tag");
					if (type === 2)
						errors.push(start + ": empty action");

				}
				/** @type {string} */
				var rawSubstring = "";
				if (rule) {
					if (lastEscapedChar !== undefined) {
						rawSubstring = escapedSubstring + "\\" + rule.substring(lastEscapedChar + 1, end);
					} else { 
						rawSubstring = rule.substring(start, end);
					}
				}
				sections.push({
					type: type,
					raw: rawSubstring
				});
				lastEscapedChar = undefined;
				escapedSubstring = "";
			};

			for (var i = 0; i < rule.length; i++) {

				if (!escaped) {
					var c = rule.charAt(i);

					switch (c) {

						// Enter a deeper bracketed section
						case '[':
							if (depth === 0 && !inTag) {
								if (start < i)
									createSection(start, i, 0);
								start = i + 1;
							}
							depth++;
							break;

						case ']':
							depth--;

							// End a bracketed section
							if (depth === 0 && !inTag) {
								createSection(start, i, 2);
								start = i + 1;
							}
							break;

						// Hashtag
						//   ignore if not at depth 0, that means we are in a bracket
						case '#':
							if (depth === 0) {
								if (inTag) {
									createSection(start, i, 1);
									start = i + 1;
								} else {
									if (start < i)
										createSection(start, i, 0);
									start = i + 1;
								}
								inTag = !inTag;
							}
							break;

						// variable handling
						case '@':
							if (depth === 0 || inVar) {
								if (inVar) {
									createSection(start, i, 3);
									start = i + 1;
									depth--;
								} else {
									if (start < i)
										createSection(start, i, 0);
									start = i + 1;
									depth++;
								}
								inVar = !inVar;
							}

							break;

						case '\\':
							escaped = true;
							escapedSubstring = escapedSubstring + rule.substring(start, i);
							start = i + 1;
							lastEscapedChar = i;
							break;
					}
				} else {
					escaped = false;
				}
			}
			if (start < rule.length)
				createSection(start, rule.length, 0);

			if (inTag) {
				errors.push("Unclosed tag");
			}
			if (depth > 0) {
				errors.push("Too many [");
			}
			if (depth < 0) {
				errors.push("Too many ]");
			}

			// Strip out empty plaintext sections

			sections = sections.filter(

				/**
				 * Description
				 * @param {{ type: number, raw: string }} section
				 * @returns {boolean}
				 */
				function (section) {
					if (section.type === 0 && section.raw.length === 0)
						return false;
					return true;
				}
			);
			return { sections: sections, errors: errors };
		},
	};

	// Externalize
	/** @type {EphemeralNode} */
	ephemeral.EphemeralNode = EphemeralNode;

	/** @type {Grammar} */
	ephemeral.Grammar = Grammar;

	/** @type {Symbol} */
	ephemeral.Symbol = Symbol;

	/** @type {RuleSet} */
	ephemeral.RuleSet = RuleSet;

	/** @type {(newRng: () => number) => void} */
	ephemeral.setRng = setRng;

	return ephemeral;
}();

