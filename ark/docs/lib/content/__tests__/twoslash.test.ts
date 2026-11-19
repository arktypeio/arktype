/* eslint-disable @typescript-eslint/no-restricted-imports -- the docs aren't a
   package with entrypoints, so tests import their modules directly */
import { attest, contextualize } from "@ark/attest"
import { degradedBy } from "../twoslash.ts"

type Nodes = Parameters<typeof degradedBy>[1]

/** a node as twoslash reports it, with only what the check reads */
const nodes = (...partial: object[]): Nodes => partial as never

contextualize(() => {
	it("rejects a declaration whose whole type is any", () => {
		// what a query shows when a package's declarations are half built
		attest(
			degradedBy("", nodes({ type: "query", text: "const User: any" }))
		).snap('"const User: any" has no type')
		// and what its hover shows, any written as lib/shiki.ts writes it
		attest(
			degradedBy("", nodes({ type: "hover", text: "const User: ..." }))
		).snap('"const User: ..." has no type')
	})

	it("accepts a type that only holds any or an elided cycle", () => {
		attest(
			degradedBy(
				"",
				nodes(
					{ type: "query", text: "const User: Type<{ meta: any }>" },
					{ type: "hover", text: "const Node: Type<{ next: ... }>" },
					{ type: "tag", text: "const tagged: any" }
				)
			)
		).equals(undefined)
	})

	it("leaves a snippet that turned errors off alone", () => {
		// it imports a package the docs don't install, so any is its type
		attest(
			degradedBy(
				'// @noErrors\nimport Fastify from "fastify"',
				nodes({ type: "hover", text: "const app: ..." })
			)
		).equals(undefined)
	})

	it("rejects a snippet whose documented error didn't occur", () => {
		const code = '// @errors: 2322 2345\nconst n: number = "a"'
		attest(degradedBy(code, nodes({ type: "error", code: 2322 }))).snap(
			"it expects TypeScript error 2345, which didn't occur"
		)
		attest(
			degradedBy(
				code,
				nodes({ type: "error", code: 2345 }, { type: "error", code: 2322 })
			)
		).equals(undefined)
	})
})
