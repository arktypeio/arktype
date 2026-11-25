import { attest, contextualize } from "@ark/attest"
import {
	errorLensMessage,
	errorLensReplace,
	originalMessage,
	summarizeDiagnostic,
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

	it("drops an ArkType error's related information", () => {
		const relatedInformation = [
			{
				message:
					"The expected type comes from property 'id' which is declared here on type 'validateObjectLiteral<{ readonly id: \"number | strin\"; }, {}, bindThis<{ readonly id: \"number | strin\"; }>>'",
				location: {
					uri: "file:///a.ts",
					range: {
						start: { line: 3, character: 22 },
						end: { line: 3, character: 42 }
					}
				}
			}
		]
		const summarized: object = summarizeDiagnostic({
			message:
				"Type '\"number | strin\"' is not assignable to type '\"number | string\"'.",
			relatedInformation
		})
		attest(summarized).snap({
			message:
				'"number | string"\nType \'"number | strin"\' is not assignable to type \'"number | string"\'.'
		})
		// only the last rule matches, which applies to any multi-line message
		attest(
			summarizeDiagnostic({
				message: "No overload matches this call.\n  Overload 1 of 2",
				relatedInformation
			}).relatedInformation
		).equals(relatedInformation)
	})

	it("originalMessage leaves a message it didn't write", () => {
		const message = "first line\nsecond line"
		attest(originalMessage(message)).equals(message)
	})
})
