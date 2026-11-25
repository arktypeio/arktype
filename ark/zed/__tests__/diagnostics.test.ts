import { attest, contextualize } from "@ark/attest"
import {
	errorLensMessage,
	errorLensReplace,
	originalMessage,
	summarizeMessage
} from "@ark/zed/internal/server/diagnostics.ts"
import { readFileSync } from "node:fs"

const readJson = (specifier: string) =>
	JSON.parse(readFileSync(new URL(import.meta.resolve(specifier)), "utf8"))

const vscodeExtension = JSON.parse(
	readFileSync(new URL("../../extension/package.json", import.meta.url), "utf8")
)

type DiagnosticCase = {
	name: string
	input: string
	/** after ErrorLens's replace rules */
	output: string
	/** what ErrorLens draws, the line Zed must show inline */
	display: string
}

const cases: DiagnosticCase[] = readJson(
	"@ark/editor-conformance/diagnostics/cases.json"
)

contextualize(() => {
	it("rules are the VS Code extension's", () => {
		attest(errorLensReplace).equals(
			vscodeExtension.contributes.configurationDefaults["errorLens.replace"]
		)
	})

	it("rewrites every conformance case as ErrorLens does", () => {
		const wrong = cases
			.filter(c => errorLensMessage(c.input) !== c.output)
			.map(c => c.name)
		attest(wrong).equals([])
	})

	it("puts what ErrorLens draws on the line Zed shows inline", () => {
		const wrong = cases
			.filter(c => summarizeMessage(c.input).split("\n")[0] !== c.display)
			.map(c => c.name)
		attest(wrong).equals([])
	})

	it("keeps the server's message after the summary", () => {
		const wrong = cases
			.filter(c => originalMessage(summarizeMessage(c.input)) !== c.input)
			.map(c => c.name)
		attest(wrong).equals([])
	})

	it("leaves a message ErrorLens draws as is", () => {
		attest(summarizeMessage("Cannot find name 'foo'.")).snap(
			"Cannot find name 'foo'."
		)
	})

	it("originalMessage leaves a message it didn't write", () => {
		const message = "first line\nsecond line"
		attest(originalMessage(message)).equals(message)
	})
})
