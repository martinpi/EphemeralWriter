
/**
 * Description
 * @param {string} text
 * @returns {Record<string, string | string[]>}
 */
function string2json(text) {
	/** @type {Record<string, string | string[]>} */
	var rules = {}
	var symbol = ""
	/** @type {string[]} */
	var expansions = []

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
