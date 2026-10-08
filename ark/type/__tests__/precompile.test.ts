import { attest, contextualize } from "@ark/attest"
import { $ark, precompileByContent, Traversal, type NodeId } from "@ark/schema"
import { scope, type } from "arktype"

contextualize(() => {
	const isEven = (n: number) => n % 2 === 0

	const define = () =>
		scope({
			user: { name: "string", age: "number.integer >= 0" },
			even: ["number", ":", isEven],
			tree: { value: "number", "children?": "tree[]" },
			a: { n: "string.numeric.parse", "b?": "b" },
			b: { "a?": "a" }
		}).export()

	const precompile = (types: ReturnType<typeof define>) =>
		precompileByContent(Object.values(types).map(t => t.internal))

	it("names a unit by its content", () => {
		const first = precompile(define())
		for (let i = 0; i < 40; i++) type({ [`k${i}`]: `number > ${i}` })
		const second = precompile(define())
		attest(Object.keys(second.names)[0] === Object.keys(first.names)[0]).equals(
			false
		)
		attest(second.source).equals(first.source)
	})

	it("validates with a unit named by content", () => {
		const types = define()
		const unit = precompile(types)
		const traversals = new Function(`return ${unit.source}`)()(
			[],
			unit.refs,
			unit.errorContexts
		)
		const declaredNames = [...new Set(Object.values(unit.names))]
		const apply = (t: { internal: { id: NodeId } }, data: unknown) => {
			const ctx = new Traversal(data, $ark.resolvedConfig!)
			traversals[declaredNames.indexOf(unit.names[t.internal.id])][1](data, ctx)
			return ctx.finalize()
		}
		const data: any = { n: "1", b: { a: { n: "x" } } }
		data.b.a.b = data.b
		attest(String(apply(types.a, data))).equals(String(types.a(data)))
		attest(String(apply(types.tree, { value: 1, children: [{}] }))).equals(
			String(types.tree({ value: 1, children: [{}] }))
		)
		attest(String(apply(types.even, 3))).equals(String(types.even(3)))
	})
})
