import { attest, contextualize } from "@ark/attest"
import { scope, type } from "arktype"

contextualize(() => {
	for (const jitless of [false, true]) {
		contextualize.each(
			jitless ? "jitless" : "jit",
			() => ({ jitless }),
			it => {
				it("rejects an object a failed branch reached", config => {
					const types = scope(
						{
							x: { v: "string", "self?": "x" },
							a: { x: "x", z: "string" },
							b: { x: "x", b: "string" },
							union: "a | b"
						},
						config
					).export()
					const data = { x: { v: "a", self: { v: 1 } }, z: "z", b: "b" }

					attest(types.union.allows(data)).equals(false)
					attest(types.union(data).toString()).snap(
						"x.self.v must be a string (was a number)"
					)
				})

				it("checks each primitive where it's reached", config => {
					const node = scope(
						{ node: { a: "node | number", "b?": "node" } },
						config
					).export().node

					attest(node.allows({ a: 5, b: 5 })).equals(false)
					attest(node({ a: 5, b: 5 }).toString()).snap(
						"b must be an object (was a number)"
					)
				})

				it("doesn't mutate its input", config => {
					const nested = scope(
						{ nested: "(nested | number)[]" },
						config
					).export().nested
					const data = [[1], [2]]

					nested(data)
					attest(data).equals([[1], [2]])
					attest(nested([[{}]]).toString()).snap(
						"value at [0][0] must be an array or a number (was {}) or [0] must be a number (was an object)"
					)
				})

				it("validates a wide tree", config => {
					const tree = scope(
						{ tree: { v: "number", kids: "tree[]" } },
						config
					).export().tree
					const data = {
						v: 0,
						kids: Array.from({ length: 4000 }, (_, v) => ({ v, kids: [] }))
					}

					attest(tree(data)).equals(data)
					data.kids[3999].v = "x" as never
					attest(tree(data).toString()).snap(
						"kids[3999].v must be a number (was a string)"
					)
				})

				it("rejects an object an undiscriminated union shares", config => {
					const types = scope(
						{
							a: { kids: "union[]", "a?": "string" },
							b: { kids: "union[]", "b?": "number" },
							union: "a | b"
						},
						config
					).export()
					let data: object = { kids: [], a: 1, b: "x" }
					for (let i = 0; i < 24; i++) data = { kids: [data, data] }

					attest(types.union.allows(data)).equals(false)
					attest(types.union(data) instanceof type.errors).equals(true)
				})

				it("reports a cyclic object once", config => {
					const node = scope(
						{ node: { v: "number", "next?": "node" } },
						config
					).export().node
					const data: { v: unknown; next?: unknown } = { v: "x" }
					data.next = data

					attest(node(data).toString()).snap(
						"v must be a number (was a string)"
					)
				})

				it("agrees on either side of its bounds", config => {
					const types = scope(
						{
							list: { v: "number", "next?": "list" },
							tree: { v: "number", kids: "tree[]" }
						},
						config
					).export()
					for (const length of [63, 64, 65, 66]) {
						let data: typeof types.list.infer = { v: 0 }
						const last = data
						for (let i = 1; i < length; i++) data = { v: i, next: data }

						attest(types.list(data)).equals(data)
						last.v = "x" as never
						attest(types.list(data).toString()).equals(
							`${"next.".repeat(length - 1)}v must be a number (was a string)`
						)
					}
					for (const length of [999, 1000, 1001]) {
						const kids = Array.from({ length }, (_, v) => ({ v, kids: [] }))
						const data = { v: 0, kids }

						attest(types.tree(data)).equals(data)
						kids[length - 1].v = "x" as never
						attest(types.tree(data).toString()).equals(
							`kids[${length - 1}].v must be a number (was a string)`
						)
					}
				})

				it("pipes cyclic output to a cyclic type", config => {
					const $ = scope({ node: { v: "number", "next?": "node" } }, config)
					const data: { v: unknown; next?: object } = { v: 0 }
					data.next = data
					const T = $.type("unknown").pipe(() => data, $.export().node)

					attest(T(null) === data).equals(true)
					data.v = "x"
					attest(T(null).toString()).snap("v must be a number (was a string)")
				})
			}
		)
	}
})
