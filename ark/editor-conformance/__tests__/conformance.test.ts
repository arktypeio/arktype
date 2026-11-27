import { attest, contextualize } from "@ark/attest"
import {
	diagnosticOutputs,
	matchDiagnosticSource,
	staleDiagnosticFiles
} from "@ark/editor-conformance/diagnostics/generate.ts"
import {
	display,
	rewrite
} from "@ark/editor-conformance/diagnostics/errorLens.ts"
import {
	oracleOutputs,
	staleOracleFiles
} from "@ark/editor-conformance/highlighting/oracle.ts"

contextualize(() => {
	describe("fixtures", () => {
		it("expected/ is what the TextMate oracle produces", async () => {
			attest(staleOracleFiles(await oracleOutputs())).equals([])
		}).timeout(60_000)

		it("cases.json and rules.json are current", async () => {
			attest(staleDiagnosticFiles(await diagnosticOutputs())).equals([])
		}).timeout(60_000)

		it("matches TypeScript diagnostic paths across Windows separators and drive casing", () => {
			const entries = [
				["sources/arktype.ts", "D:\\repo\\diagnostics\\sources\\arktype.ts"],
				[
					"sources/typescript.ts",
					"D:\\repo\\diagnostics\\sources\\typescript.ts"
				]
			] as const
			attest(
				matchDiagnosticSource("D:/repo/diagnostics/sources/arktype.ts", entries)
			).equals("sources/arktype.ts")
			attest(
				matchDiagnosticSource(
					"d:/repo/diagnostics/sources/typescript.ts",
					entries
				)
			).equals("sources/typescript.ts")
			attest(
				matchDiagnosticSource("D:/repo/diagnostics/sources/other.ts", entries)
			).equals(undefined)
		})
	})

	// the expectations below are written out by hand, so they check the port
	// of ErrorLens that cases.json is generated with
	describe("errorLens port", () => {
		it("rewrites a completion to the type it expects", () => {
			attest(
				rewrite(
					`Argument of type '"number | strin"' is not assignable to parameter of type '"number | string"'.`
				)
			).equals({ message: '"number | string"', rule: 3 })
		})

		it("keeps the zero-width space ending an ArkType error", () => {
			attest(
				rewrite(
					`Argument of type '"(string"' is not assignable to parameter of type '"Missing )\u200B"'.`
				)
			).equals({ message: "Missing )\u200B", rule: 2 })
		})

		it("finds ErrorType on the last line of a chain", () => {
			attest(
				rewrite(
					`Argument of type '"number"' is not assignable to parameter of type '"number" & ErrorType<["Invalid argument for T", expected: string]>'.\n  Type 'string' is not assignable to type 'ErrorType<["Invalid argument for T", expected: string]>'.`
				)
			).equals({
				message: '["Invalid argument for T", expected: string]',
				rule: 0
			})
		})

		it("expands replacement patterns in a group's text", () => {
			attest(
				rewrite(
					`Type 'string' is not assignable to type 'ErrorType<"costs $& now">'.`
				).message
			).equals("costs $1 now")
		})

		it("keeps the last line of any other multi-line message", () => {
			attest(rewrite("First.\n  Second.")).equals({
				message: "  Second.",
				rule: 4
			})
		})

		it("passes other messages through", () => {
			attest(rewrite("Cannot find name 'x'.")).equals({
				message: "Cannot find name 'x'.",
				rule: null
			})
		})

		it("draws line breaks as ⏎ and cuts at 500 code points", () => {
			attest(display("a\r\n\tb")).equals("a⏎b")
			attest([...display("😀".repeat(501))].length).equals(501)
		})
	})
})
