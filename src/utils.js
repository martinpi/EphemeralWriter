
/**
 * Description
 * @param {string} text
 * @returns {{}}
 */
function string2json(text) {
	var rules = {}
	var symbol = ""
	var expansions = new Array()

	let lines = text.split('\n')
	lines.forEach(line => {
		let trimmed = line.trim()

		if (trimmed.length == 0 || trimmed.startsWith("\\\\"))
			return

		if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
			if (symbol.length > 0) {
				rules[symbol] = expansions
				expansions = new Array()
			}
			symbol = trimmed.substring(1, trimmed.length - 1)
		} else {
			expansions.push(trimmed)
		}

		if (symbol.length > 0) {
			rules[symbol] = expansions
		}
	})
	return rules
}
