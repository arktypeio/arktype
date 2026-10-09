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
	const T = rootSchema({
		domain: "object",
		required: [{ key: "foo", value: "string" }]
	}).assertHasKind("intersection")

	it("kind", () => {
		const result = rootSchema({ domain: "string" }).select("domain")
		attest<DomainNode[]>(result).snap([{ domain: "string" }])
	})

	it("self", () => {
		const selfResult = T.select("self")
		attest<Intersection.Node[]>(selfResult).snap([
			{ required: [{ key: "foo", value: "string" }], domain: "object" }
		])
	})

	it("children", () => {
		const children = T.select("child")
		attest<nodeOfKind<"intersection" | Intersection.ChildKind>[]>(
			children
		).snap([
			{ domain: "object" },
			{ required: [{ key: "foo", value: "string" }] }
		])
	})

	it("shallow", () => {
		const shallow = T.select("shallow")
		attest<BaseNode[]>(shallow).snap([
			{ required: [{ key: "foo", value: "string" }], domain: "object" },
			{ domain: "object" },
			{ required: [{ key: "foo", value: "string" }] },
			{ key: "foo", value: "string" }
		])
	})

	it("references", () => {
		const refs = T.select("references")
		attest<BaseNode[]>(refs).snap([
			{ required: [{ key: "foo", value: "string" }], domain: "object" },
			{ domain: "object" },
			{ required: [{ key: "foo", value: "string" }] },
			{ key: "foo", value: "string" },
			{ domain: "string" }
		])
	})

	it("predicate", () => {
		const domains = T.select(n => n.hasKind("domain"))
		attest<DomainNode[]>(domains).snap([
			{ domain: "object" },
			{ domain: "string" }
		])
	})

	it("find", () => {
		const domain = T.select({ method: "find", kind: "domain" })
		attest<DomainNode | undefined>(domain).snap({ domain: "object" })

		const pattern = T.select({ method: "find", kind: "pattern" })
		attest<PatternNode | undefined>(pattern).snap(undefined)
	})

	it("assertFind", () => {
		const domain = T.select({ method: "assertFind", kind: "domain" })
		attest<DomainNode>(domain).snap({ domain: "object" })

		attest(() =>
			T.select({ method: "assertFind", kind: "pattern" })
		).throws.snap(
			'Error: Type<{ foo: string }> had no references matching {"boundary":"references","method":"assertFind","kind":"pattern"}.'
		)
	})

	it("assertFilter", () => {
		const domains = T.select({ method: "assertFilter", kind: "domain" })
		attest<[DomainNode, ...DomainNode[]]>(domains).snap([
			{ domain: "object" },
			{ domain: "string" }
		])

		attest(() =>
			T.select({ method: "assertFilter", kind: "pattern" })
		).throws.snap(
			'Error: Type<{ foo: string }> had no references matching {"boundary":"references","method":"assertFilter","kind":"pattern"}.'
		)
	})

	describe("completions", () => {
		it("shallow completions", () => {
			// @ts-expect-error
			attest(() => T.select("")).completions({
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
				T.select({
					// @ts-expect-error
					"": {} as any
				})
			).completions({ "": ["boundary", "kind", "method"] })
		})

		it("composite kind completions", () => {
			attest(() =>
				T.select({
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
				T.select({
					// @ts-expect-error
					boundary: ""
				})
			).completions({ "": ["child", "references", "self", "shallow"] })
		})

		it("composite method completions", () => {
			attest(() =>
				T.select({
					// @ts-expect-error
					method: ""
				})
			).completions({ "": ["assertFilter", "assertFind", "filter", "find"] })
		})
	})

	it("non-narrowing where", () => {
		const result = T.select({
			kind: "domain",
			where: d => d.domain === "string"
		})
		attest<DomainNode[]>(result).snap([{ domain: "string" }])
	})

	it("predicate narrows kind", () => {
		type StringDomain = DomainNode & { domain: string }
		const result = T.select({
			kind: "domain",
			where: (d): d is StringDomain => d.domain === "string"
		})
		attest<StringDomain[]>(result).snap([{ domain: "string" }])
	})
})
