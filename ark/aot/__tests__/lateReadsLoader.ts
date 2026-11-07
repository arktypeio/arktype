// a transform after arktype's that adds reads of a validator, as a Babel plugin
// or a framework's plugin rewriting a module arktype already wrote does: each
// "__ARK_LATE_<n>__" string in a module becomes the read the fuzzer withheld
// from its source, so a build reading the source never sees it
export const lateApplied = (code: string, reads: string[]): string =>
	code.replace(/(["'])__ARK_LATE_(\d+)__\1/g, (_, __, n: string) => reads[+n])

// the same as a webpack or Rspack loader, given the reads as its options
export default function (
	this: { getOptions: () => { reads: string[] } },
	source: string
): string {
	return lateApplied(source, this.getOptions().reads)
}

// the same as a Babel plugin, which Next runs on each module after the
// loaders Turbopack's rules name, reading the reads from beside it
export const babelPlugin = `const reads = require("./late-reads.json")
module.exports = () => ({
	visitor: {
		StringLiteral(path) {
			const match = /^__ARK_LATE_(\\d+)__$/.exec(path.node.value)
			if (match) path.replaceWithSourceString(reads[+match[1]])
		}
	}
})
`
