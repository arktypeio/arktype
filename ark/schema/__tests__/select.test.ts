import { attest, contextualize } from "@ark/attest"
import {
	rootSchema,
	type BaseNode,
	type DomainNode,
	type Intersection,
	type nodeOfKind
} from "@ark/schema"

contextualize(() => {
	const t = rootSchema({
		domain: "object",
		required: [{ key: "foo", value: "string" }]
	}).assertHasKind("intersection")

	it("kind", () => {
		const result = rootSchema({ domain: "string" }).select("domain")
		attest<DomainNode[]>(result).snap([{ domain: "string" }])
	})

	it("self", () => {
		const selfResult = t.select("self")
		attest<Intersection.Node[]>(selfResult).snap()
	})

	it("children", () => {
		const children = t.select("child")
		attest<nodeOfKind<"intersection" | Intersection.ChildKind>[]>(
			children
		).snap()
	})

	it("shallow", () => {
		const shallow = t.select("shallow")
		attest<BaseNode[]>(shallow).snap()
	})

	it("references", () => {
		const refs = t.select("references")
		attest<BaseNode[]>(refs).snap([
			{ required: [{ key: "foo", value: "string" }], domain: "object" },
			{ domain: "object" },
			{ required: [{ key: "foo", value: "string" }] },
			{ key: "foo", value: "string" },
			{ domain: "string" }
		])
	})

	it("predicate", () => {
		const domains = t.select(n => n.hasKind("domain"))
		attest<DomainNode[]>(domains).snap()
	})

	it("predicate narrows kind", () => {
		type StringDomain = DomainNode & { domain: string }
		const result = t.select({
			kind: "domain",
			where: (d): d is StringDomain => d.domain === "string"
		})
		attest<StringDomain[]>(result).snap()
	})
})
