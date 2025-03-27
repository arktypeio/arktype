import { attest, contextualize } from "@ark/attest"
import {
	rootSchema,
	type BaseNode,
	type DomainNode,
	type Intersection,
	type nodeOfKind,
	type PatternNode
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
		attest<Intersection.Node[]>(selfResult).snap([
			{ required: [{ key: "foo", value: "string" }], domain: "object" }
		])
	})

	it("children", () => {
		const children = t.select("child")
		attest<nodeOfKind<"intersection" | Intersection.ChildKind>[]>(
			children
		).snap([
			{ domain: "object" },
			{ required: [{ key: "foo", value: "string" }] }
		])
	})

	it("shallow", () => {
		const shallow = t.select("shallow")
		attest<BaseNode[]>(shallow).snap([
			{ required: [{ key: "foo", value: "string" }], domain: "object" },
			{ domain: "object" },
			{ required: [{ key: "foo", value: "string" }] },
			{ key: "foo", value: "string" }
		])
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
		attest<DomainNode[]>(domains).snap([
			{ domain: "object" },
			{ domain: "string" }
		])
	})

	it("find", () => {
		const domain = t.select({ method: "find", kind: "domain" })
		attest<DomainNode | undefined>(domain).snap({ domain: "object" })

		const pattern = t.select({ method: "find", kind: "pattern" })
		attest<PatternNode | undefined>(pattern).snap(undefined)
	})

	it("assertFind", () => {
		const domain = t.select({ method: "assertFind", kind: "domain" })
		attest<DomainNode>(domain).snap({ domain: "object" })

		attest(() =>
			t.select({ method: "assertFind", kind: "pattern" })
		).throws.snap(
			'Error: Type<{ foo: string }> had no references matching {"boundary":"references","method":"assertFind","kind":"pattern"}.'
		)
	})

	it("assertFilter", () => {
		const domains = t.select({ method: "assertFilter", kind: "domain" })
		attest<[DomainNode, ...DomainNode[]]>(domains).snap([
			{ domain: "object" },
			{ domain: "string" }
		])

		attest(() =>
			t.select({ method: "assertFilter", kind: "pattern" })
		).throws.snap(
			'Error: Type<{ foo: string }> had no references matching {"boundary":"references","method":"assertFilter","kind":"pattern"}.'
		)
	})

	describe("completions", () => {
		it("shallow completions", () => {
			// @ts-expect-error
			attest(() => t.select("")).completions({
				"": [
					"after",
					"alias",
					"before",
					"child",
					"divisor",
					"domain",
					"exactLength",
					"index",
					"intersection",
					"max",
					"maxLength",
					"min",
					"minLength",
					"morph",
					"optional",
					"pattern",
					"predicate",
					"proto",
					"references",
					"required",
					"self",
					"sequence",
					"shallow",
					"structure",
					"union",
					"unit"
				]
			})
		})

		it("composite key completions", () => {
			attest(() =>
				t.select({
					// @ts-expect-error
					"": {} as any
				})
			).completions({ "": ["boundary", "kind", "method"] })
		})

		it("composite kind completions", () => {
			attest(() =>
				t.select({
					// @ts-expect-error
					kind: ""
				})
			).completions({
				"": [
					"after",
					"alias",
					"before",
					"divisor",
					"domain",
					"exactLength",
					"index",
					"intersection",
					"max",
					"maxLength",
					"min",
					"minLength",
					"morph",
					"optional",
					"pattern",
					"predicate",
					"proto",
					"required",
					"sequence",
					"structure",
					"union",
					"unit"
				]
			})
		})

		it("composite boundary completions", () => {
			attest(() =>
				t.select({
					// @ts-expect-error
					boundary: ""
				})
			).completions({ "": ["child", "references", "self", "shallow"] })
		})

		it("composite method completions", () => {
			attest(() =>
				t.select({
					// @ts-expect-error
					method: ""
				})
			).completions({ "": ["assertFilter", "assertFind", "filter", "find"] })
		})
	})

	it("non-narrowing where", () => {
		const result = t.select({
			kind: "domain",
			where: d => d.domain === "string"
		})
		attest<DomainNode[]>(result).snap([{ domain: "string" }])
	})

	it("predicate narrows kind", () => {
		type StringDomain = DomainNode & { domain: string }
		const result = t.select({
			kind: "domain",
			where: (d): d is StringDomain => d.domain === "string"
		})
		attest<StringDomain[]>(result).snap([{ domain: "string" }])
	})
})
