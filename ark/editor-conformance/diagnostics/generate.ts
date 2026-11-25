// Regenerates cases.json and rules.json: real diagnostics from TypeScript
// for the files in sources/, and the hand-written ones in synthetic.ts, each
// with what the VS Code extension's ErrorLens rules turn it into.
//
//   node ark/editor-conformance/diagnostics/generate.ts           write
//   node ark/editor-conformance/diagnostics/generate.ts --check   fail if stale
import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import ts from "typescript-6"
import { display, displayDefaults, replaceRules, rewrite } from "./errorLens.ts"
import { formatFor } from "../format.ts"
import { syntheticCases } from "./synthetic.ts"

const here = new URL("./", import.meta.url)
const sources = ["sources/arktype.ts", "sources/typescript.ts"]

export type DiagnosticCase = {
	name: string
	origin: "tsc" | "synthetic"
	/** for tsc cases: the file, line and TypeScript error code */
	source?: string
	/** the message as VS Code's TypeScript extension reports it */
	input: string
	/** the message after the extension's errorLens.replace rules */
	output: string
	/** which rule matched, or null if the message passed through */
	rule: number | null
	/** what ErrorLens draws, with its default line-break and length settings */
	display: string
}

const tscCases = (): DiagnosticCase[] => {
	const files = sources.map(source => fileURLToPath(new URL(source, here)))
	const program = ts.createProgram(files, {
		strict: true,
		noEmit: true,
		skipLibCheck: true,
		target: ts.ScriptTarget.ES2022,
		module: ts.ModuleKind.NodeNext,
		moduleResolution: ts.ModuleResolutionKind.NodeNext,
		customConditions: ["ark-ts"],
		allowImportingTsExtensions: true
	})
	return ts
		.getPreEmitDiagnostics(program)
		.filter(d => d.file && files.includes(d.file.fileName))
		.map(d => {
			const { line } = d.file!.getLineAndCharacterOfPosition(d.start!)
			const sourceLine = d.file!.text.split("\n")[line]
			// tsserver flattens a message chain the same way for VS Code
			const input = ts.flattenDiagnosticMessageText(d.messageText, "\n")
			const { message, rule } = rewrite(input)
			const file = sources.find(s => d.file!.fileName.endsWith(s))!
			return {
				name: sourceLine.replace(/^export const (\w+).*$/, "$1"),
				origin: "tsc" as const,
				source: `${file}:${line + 1} TS${d.code}`,
				input,
				output: message,
				rule,
				display: display(message)
			}
		})
}

/** cases.json and rules.json as they should read now. */
export const diagnosticOutputs = async (): Promise<Map<string, string>> => {
	const cases: DiagnosticCase[] = [
		...tscCases(),
		...syntheticCases.map(({ name, input }) => {
			const { message, rule } = rewrite(input)
			return {
				name,
				origin: "synthetic" as const,
				input,
				output: message,
				rule,
				display: display(message)
			}
		})
	]

	const rulesSpec = {
		$comment:
			"The VS Code extension's errorLens.replace rules (ark/extension/package.json) and how ErrorLens v3.30.0 applies them. cases.json holds inputs and expected outputs; errorLens.ts is a reference implementation.",
		semantics: {
			flags: "iu",
			order:
				"Rules are tried in order on the whole message; the first whose matcher matches anywhere wins and no later rule runs.",
			substitution:
				"The output starts as the rule's message. For each group N from 0 to the last, every `$N` in it is replaced, as JavaScript's String.prototype.replace(new RegExp('\\\\$N', 'gu'), groupN) does: replacement patterns in the group's text ($&, $$, $`, $') are expanded, and a group that didn't participate becomes the text 'undefined'.",
			noMatch: "A message no rule matches is shown unchanged.",
			input:
				"The diagnostic message as VS Code's TypeScript extension gives it: tsserver flattens a message chain with '\\n', indenting each level two more spaces.",
			display:
				"ErrorLens then draws the message after the line: with its defaults, each run of \\n, \\r and \\t becomes ⏎ and a message over 500 code points is cut to 500 and ends with …."
		},
		rules: replaceRules,
		displayDefaults
	}

	const outputs = new Map<string, string>()
	for (const [file, value] of [
		["cases.json", cases],
		["rules.json", rulesSpec]
	] as const) {
		outputs.set(
			file,
			await formatFor(new URL(file, here), JSON.stringify(value))
		)
	}
	return outputs
}

export const staleDiagnosticFiles = (outputs: Map<string, string>): string[] =>
	[...outputs]
		.filter(
			([file, contents]) =>
				readFileSync(new URL(file, here), "utf8") !== contents
		)
		.map(([file]) => file)

if (import.meta.main) {
	const outputs = await diagnosticOutputs()
	if (process.argv.includes("--check")) {
		const stale = staleDiagnosticFiles(outputs)
		if (stale.length) {
			console.error(
				`${stale.join(", ")} stale; run node ark/editor-conformance/diagnostics/generate.ts`
			)
			process.exit(1)
		}
		console.log("diagnostics are current")
	} else {
		for (const [file, contents] of outputs)
			writeFileSync(new URL(file, here), contents)
		console.log("wrote cases.json and rules.json")
	}
}
