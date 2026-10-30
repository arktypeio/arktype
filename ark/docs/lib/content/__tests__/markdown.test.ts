/* eslint-disable @typescript-eslint/no-restricted-imports -- the docs aren't a
   package with entrypoints, so tests import their modules directly */
import { attest, contextualize } from "@ark/attest"
import { codeForMarkdown } from "../markdown.ts"

contextualize(() => {
	it("query results and errors are written under their lines", () => {
		const value = `// @errors: 2322
const n: number = "five"
const s = "five"
//    ^?`
		attest(codeForMarkdown({ type: "code", lang: "ts", value }))
			.snap(`const n: number = "five"
// TypeScript: Type 'string' is not assignable to type 'number'.
const s = "five"
// const s: "five"`)
	})

	it("errors already described in a comment aren't repeated", () => {
		const value = `// @errors: 2322
// TypeScript: Type 'string' is not assignable to type 'number'
const above: number = "a"
const beside: number = "b" // not a number
const runtime: number = "c" // ArkErrors: must be a number (was string)`
		attest(codeForMarkdown({ type: "code", lang: "ts", value }))
			.snap(`// TypeScript: Type 'string' is not assignable to type 'number'
const above: number = "a"
const beside: number = "b" // not a number
const runtime: number = "c" // ArkErrors: must be a number (was string)
// TypeScript: Type 'string' is not assignable to type 'number'.`)
	})
})
