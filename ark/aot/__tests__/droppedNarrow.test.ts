import { attest, contextualize } from "@ark/attest"
import { renderDiagnostic } from "@ark/aot"
import { check } from "@ark/aot/internal/check.ts"
import { configs } from "@ark/aot/eslint"
import { Linter } from "eslint"
import { join } from "node:path"
import { analyze, diagnosticsOf, precompile, writeFixture } from "./utils.ts"

const datesDecl = `const Dates = type({
	issued: "string.date",
	due: "string.date"
}).narrow(
	(dates, ctx) =>
		dates.due >= dates.issued || ctx.mustBe("due on or after issued")
)`

contextualize(() => {
	describe('object spread "..."', () => {
		it('warns when "..." drops a root-level .narrow()', () => {
			const source = `import { type } from "arktype"
${datesDecl}
export const Invoice = type({ "...": Dates, total: "number" })`
			const result = analyze(source)
			attest(
				result.diagnostics.map(d => ({
					severity: d.severity,
					rule: d.rule,
					line: d.line,
					column: d.column,
					message: d.message,
					hint: d.hint
				}))
			).snap([
				{
					severity: "warning",
					rule: "dropped-narrow",
					line: 9,
					column: 31,
					message: '`Dates` has a narrow that `"..."` drops',
					hint: "Derive from the base properties and apply .narrow() to the result, or put // @ark-allow-drop-narrow on the line before it if dropping it is intended."
				}
			])
			// the site is still accepted and precompiled
			attest(result.sites.every(s => s.status === "accepted")).equals(true)
			attest(precompile(source).code).type.toString("string")
		})

		it('warns when "..." drops a root-level .filter()', () => {
			const source = `import { type } from "arktype"
const Filtered = type({
	a: "string",
	b: "string"
}).filter(o => o.a !== o.b)
export const Extended = type({ "...": Filtered, c: "number" })`
			attest(diagnosticsOf(source)).snap([
				'/main.ts:6:32  `Filtered` has a narrow that `"..."` drops\n  Derive from the base properties and apply .narrow() to the result, or put // @ark-allow-drop-narrow on the line before it if dropping it is intended.'
			])
		})

		it("warns on nested spreads, referenced object definitions, and tuple expressions", () => {
			const source = `import { type } from "arktype"
${datesDecl}
const def = { "...": Dates, total: "number" }
export const Nested = type({ invoice: { "...": Dates, total: "number" } })
export const FromDef = type(def)
export const FromIntersection = type({ "...": [Dates, "&", { currency: "string" }], total: "number" })`
			attest(diagnosticsOf(source).map(d => d.split("\n")[0])).snap([
				'/main.ts:9:15  `Dates` has a narrow that `"..."` drops',
				'/main.ts:10:41  `Dates` has a narrow that `"..."` drops',
				'/main.ts:12:40  `[Dates, "&", { currency: "string" }]` has a narrow that `"..."` drops'
			])
		})

		it("warns in scope() and type.module() definitions", () => {
			const source = `import { scope, type } from "arktype"
${datesDecl}
const $ = scope({
	dates: Dates,
	invoice: { "...": "dates", total: "number" },
	direct: { "...": Dates, total: "number" }
})
export const { invoice, direct } = $.export()
export const Another = $.type({ "...": "dates", extra: "boolean" })
export const Mod = type.module({
	dates: Dates,
	invoice: { "...": "dates", total: "number" }
})`
			attest(diagnosticsOf(source).map(d => d.split("\n")[0])).snap([
				'/main.ts:11:13  `dates` has a narrow that `"..."` drops',
				'/main.ts:12:12  `Dates` has a narrow that `"..."` drops',
				'/main.ts:15:33  `dates` has a narrow that `"..."` drops',
				'/main.ts:18:13  `dates` has a narrow that `"..."` drops'
			])
		})

		it("does not warn for property-level narrows or escaped literal keys", () => {
			const source = `import { type } from "arktype"
const Base = type({
	email: type.string.narrow(s => s.includes("@")),
	age: type.number.filter(n => n >= 0)
})
export const Extended = type({ "...": Base, role: "'admin' | 'user'" })
export const Escaped = type({ "\\\\...": type({ a: "string" }).narrow(o => o.a.length > 0) })`
			attest(diagnosticsOf(source)).equals([])
		})

		it("does not warn for built-in internal predicates like fromJsonSchema isNonArray, minProperties, or object.json", () => {
			const source = `import { fromJsonSchema, type } from "arktype"
const FromSchema = fromJsonSchema({
	type: "object",
	properties: { name: { type: "string" } },
	required: ["name"]
})
export const ExtendedSchema = type({ "...": FromSchema, extra: "number" })
export const MergedSchema = FromSchema.merge({ extra: "number" })
export const PickedSchema = FromSchema.pick("name")
const JsonObj = type("object.json")
export const ExtendedJson = type({ "...": JsonObj, extra: "number" })
const ConstObj = fromJsonSchema({ const: { a: 1 } })
export const ExtendedConst = type({ "...": ConstObj, b: "number" })
export const MergedConst = ConstObj.merge({ b: "number" })`
			attest(diagnosticsOf(source)).equals([])

			const minPropsSource = `import { fromJsonSchema, type } from "arktype"
const MinPropsSchema = fromJsonSchema({
	type: "object",
	properties: { a: { type: "string" } },
	minProperties: 1,
	maxProperties: 3
})
export const ExtendedMinProps = type({ "...": MinPropsSchema, b: "number" })
export const MergedMinProps = MinPropsSchema.merge({ b: "number" })`
			attest(
				analyze(minPropsSource, {}, { runtime: "arktype" }).diagnostics.filter(
					d => d.rule === "dropped-narrow"
				)
			).equals([])
		})

		it("does not warn when immediately re-narrowed via .narrow(), .filter(), or tuple narrow syntax", () => {
			const source = `import { keywords, scope, type } from "arktype"
${datesDecl}
const check = (o: { issued: string; due: string }) => o.due >= o.issued
export const SpreadNarrow = type({ "...": Dates, total: "number" }).narrow(check)
export const SpreadFilter = type({ "...": Dates, total: "number" }).filter(check)
export const SpreadDescribedNarrow = type({ "...": Dates, total: "number" }).describe("invoice").narrow(check)
export const SpreadAndNarrow = type({ "...": Dates, total: "number" }).and({ note: "string" }).narrow(check)
export const MergeNarrow = Dates.merge({ total: "number" }).narrow(check)
export const MergeFilter = Dates.merge({ total: "number" }).filter(check)
export const PartialNarrow = Dates.partial().narrow(o => !o.issued || !o.due || o.due >= o.issued)
export const StaticMergeNarrow = type.merge(Dates, { total: "number" }).narrow(check)
export const GenericPartialNarrow = keywords.Partial(Dates).narrow(o => !!o)
export const TupleNaryNarrow = type({ "...": Dates, total: "number" }, ":", check)
export const TupleArrNarrow = type([{ "...": Dates, total: "number" }, ":", check])
const $ = scope({
	dates: Dates,
	invoice: [{ "...": "dates", total: "number" }, ":", check],
	partialChecked: ["Partial<dates>", ":", (o: { issued?: string }) => !!o]
})
export const scoped = $.export()
export const ScopedSpreadNarrow = $.type({ "...": "dates", total: "number" }).narrow(check)
export const ScopedGenericNarrow = $.type("Partial<dates>").narrow(o => !!o)`
			attest(diagnosticsOf(source)).equals([])
		})

		it("still warns when a nested spread is not narrowed, when a later op drops the re-narrow, or across separate declarations", () => {
			const source = `import { scope, type } from "arktype"
${datesDecl}
const check = (o: { issued: string; due: string }) => o.due >= o.issued
// nested spread inside a property is NOT re-narrowed by an outer .narrow()
export const NestedOuterNarrow = type({ invoice: { "...": Dates, total: "number" } }).narrow(o => o.invoice.total > 0)
// chained .pick() after .narrow() drops the new narrow -> warns for .pick(), not "..."
export const ReDropped = type({ "...": Dates, total: "number" }).narrow(check).pick("issued")
// separate declaration still warns on the un-narrowed Invoice
export const Invoice = type({ "...": Dates, total: "number" })
export const Checked = Invoice.narrow(check)
// nested spread inside scope tuple narrow still warns
const $ = scope({
	dates: Dates,
	order: [{ invoice: { "...": "dates", total: "number" } }, ":", (o: { invoice: { total: number } }) => o.invoice.total > 0]
})
export const scoped = $.export()`
			attest(diagnosticsOf(source).map(d => d.split("\n")[0])).snap([
				'/main.ts:11:52  `Dates` has a narrow that `"..."` drops',
				'/main.ts:13:26  `type({ "...": Dates, total: "number" }).narrow(check)` has a narrow that `.pick()` drops',
				'/main.ts:15:31  `Dates` has a narrow that `"..."` drops',
				'/main.ts:20:23  `dates` has a narrow that `"..."` drops'
			])
		})

		it("does not warn on non-definition arguments in n-ary type() calls", () => {
			const source = `import { type } from "arktype"
${datesDecl}
export const Unit = type("===", { "...": Dates })
export const MetaObj = type({ a: "string" }, "@", { note: { "...": Dates } })
export const WithMetaSpread = type({ "...": Dates, total: "number" }, "@", "invoice")`
			attest(diagnosticsOf(source).map(d => d.split("\n")[0])).snap([
				'/main.ts:11:38  `Dates` has a narrow that `"..."` drops'
			])
		})

		it("does not emit spurious warnings for unspreadable operands in lazy scope() definitions", () => {
			const source = `import { scope, type } from "arktype"
${datesDecl}
const U = Dates.or({ c: "number" })
export const $ = scope({
	u: U,
	arr: type("string[]").narrow(xs => xs.length > 0),
	bad1: { "...": "u", d: "boolean" },
	bad2: { "...": U, d: "boolean" },
	bad3: { "...": "arr", d: "boolean" },
	bad4: { "...": ["string[]", ":", (xs: string[]) => xs.length > 0], d: "boolean" },
	bad5: { "...": [Dates, "&", "string[]"], d: "boolean" },
	bad6: { "...": [Dates, "&", "number"], d: "boolean" },
	good: { "...": Dates, d: "boolean" }
})`
			attest(diagnosticsOf(source).map(d => d.split("\n")[0])).snap([
				'/main.ts:19:10  `Dates` has a narrow that `"..."` drops'
			])
		})

		it("warns on spreads inside standalone generic bodies", () => {
			const source = `import { scope, type } from "arktype"
${datesDecl}
export const Boxed = type("<t>", { "...": Dates, val: "t" })
export const Curried = type.generic("t")({ "...": Dates, val: "t" })
const $ = scope({ dates: Dates })
export const ScopedGeneric = $.type("<t>", { "...": "dates", val: "t" })`
			attest(diagnosticsOf(source).map(d => d.split("\n")[0])).snap([
				'/main.ts:9:36  `Dates` has a narrow that `"..."` drops',
				'/main.ts:10:44  `Dates` has a narrow that `"..."` drops',
				'/main.ts:12:46  `dates` has a narrow that `"..."` drops'
			])
		})
	})

	describe("structural methods", () => {
		it("warns on .merge() when receiver, argument, or both drop a narrow", () => {
			const source = `import { type } from "arktype"
${datesDecl}
const Other = type({ x: "number" }).narrow(o => o.x > 0)
export const ReceiverDropped = Dates.merge({ total: "number" })
export const ArgDropped = type({ total: "number" }).merge(Dates)
export const BothDropped = Dates.merge(Other)
export const StaticMerge = type.merge(Dates, { total: "number" })`
			attest(diagnosticsOf(source).map(d => d.split("\n")[0])).snap([
				"/main.ts:10:32  `Dates` has a narrow that `.merge()` drops",
				"/main.ts:11:27  `Dates` has a narrow that `.merge()` drops",
				"/main.ts:12:28  `Dates` has a narrow that `.merge()` drops",
				"/main.ts:12:28  `Other` has a narrow that `.merge()` drops",
				"/main.ts:13:28  `Dates` has a narrow that `.merge()` drops"
			])
		})

		it("warns on .pick(), .omit(), and .map()", () => {
			const source = `import { type } from "arktype"
${datesDecl}
export const Picked = Dates.pick("issued")
export const Omitted = Dates.omit("due")
export const Mapped = Dates.map(prop => prop)`
			attest(diagnosticsOf(source).map(d => d.split("\n")[0])).snap([
				"/main.ts:9:23  `Dates` has a narrow that `.pick()` drops",
				"/main.ts:10:24  `Dates` has a narrow that `.omit()` drops",
				"/main.ts:11:23  `Dates` has a narrow that `.map()` drops"
			])
		})

		it("matches exact runtime semantics for .partial() and .required()", () => {
			const source = `import { type } from "arktype"
const AllReq = type({ a: "string", b: "number" }).narrow(o => o.b > 0)
const AllOpt = type({ "a?": "string", "b?": "number" }).narrow(o => o.b !== 0)
const Mixed = type({ a: "string", "b?": "number" }).narrow(o => o.a.length > 0)
const Arr = type("string[]").narrow(xs => xs.length > 0)
const Tuple = type(["string", "number"]).narrow(t => t[1] > 0)

// these actually drop the narrow at runtime -> warn
export const ReqPartial = AllReq.partial()
export const OptRequired = AllOpt.required()
export const MixedPartial = Mixed.partial()
export const MixedRequired = Mixed.required()
export const TuplePartial = Tuple.partial()

// these are runtime no-ops that preserve the branch and its narrow -> no warning
export const OptPartial = AllOpt.partial()
export const ReqRequired = AllReq.required()
export const ArrPartial = Arr.partial()
export const ArrRequired = Arr.required()

// selective .partial(...keys) and .required(...keys)
export const SelectivePartialDrop = Mixed.partial("a")
export const SelectivePartialNoop = Mixed.partial("b")
export const SelectiveRequiredDrop = Mixed.required("b")
export const SelectiveRequiredNoop = Mixed.required("a")`
			attest(diagnosticsOf(source).map(d => d.split("\n")[0])).snap([
				"/main.ts:9:27  `AllReq` has a narrow that `.partial()` drops",
				"/main.ts:10:28  `AllOpt` has a narrow that `.required()` drops",
				"/main.ts:11:29  `Mixed` has a narrow that `.partial()` drops",
				"/main.ts:12:30  `Mixed` has a narrow that `.required()` drops",
				"/main.ts:13:29  `Tuple` has a narrow that `.partial()` drops",
				"/main.ts:22:37  `Mixed` has a narrow that `.partial()` drops",
				"/main.ts:24:38  `Mixed` has a narrow that `.required()` drops"
			])
		})

		it("warns on built-in structural generics (Pick, Omit, Partial, Required, Merge)", () => {
			const source = `import { keywords, type } from "arktype"
${datesDecl}
export const P = keywords.Partial(Dates)
export const K = keywords.Pick(Dates, "'issued'")
export const O = keywords.Omit(Dates, "'due'")
export const M = keywords.Merge(Dates, { total: "number" })
// runtime no-op (all keys already required) -> no warning
export const R = keywords.Required(Dates)`
			attest(diagnosticsOf(source).map(d => d.split("\n")[0])).snap([
				"/main.ts:9:18  `Dates` has a narrow that `.partial()` drops",
				"/main.ts:10:18  `Dates` has a narrow that `.pick()` drops",
				"/main.ts:11:18  `Dates` has a narrow that `.omit()` drops",
				"/main.ts:12:18  `Dates` has a narrow that `.merge()` drops"
			])
		})

		it("handles tuple narrows, tuple unions, and meta tuples accurately", () => {
			const source = `import { keywords, type } from "arktype"
${datesDecl}
const B = type({ issued: "string.date", extra: "boolean" })
const check = (o: { a?: string; b?: number }) => !!o
// runtime no-ops on tuple narrows -> no false positives
export const ReqNoop = keywords.Required([{ a: "string", b: "number" }, ":", check])
export const PartNoop = keywords.Partial([{ "a?": "string", "b?": "number" }, ":", check])
// tuple narrow that actually drops -> warns
export const PartDrop = keywords.Partial([{ a: "string", b: "number" }, ":", check])
// tuple unions dropping Dates's narrow -> warn
export const MergeUnion = type({ z: "string" }).merge([Dates, "|", B])
export const StaticMergeUnion = type.merge({ z: "string" }, [Dates, "|", B])
export const PartialUnion = keywords.Partial([Dates, "|", B])
export const PickUnion = keywords.Pick([Dates, "|", B], "'issued'")
// meta tuple spread dropping Dates's narrow -> warns
export const MetaSpread = type({ "...": [Dates, "@", "date range"], total: "number" })`
			attest(diagnosticsOf(source).map(d => d.split("\n")[0])).snap([
				'/main.ts:15:25  `[{ a: "string", b: "number" }, ":", check]` has a narrow that `.partial()` drops',
				'/main.ts:17:27  `[Dates, "|", B]` has a narrow that `.merge()` drops',
				'/main.ts:18:33  `[Dates, "|", B]` has a narrow that `.merge()` drops',
				'/main.ts:19:29  `[Dates, "|", B]` has a narrow that `.partial()` drops',
				'/main.ts:20:26  `[Dates, "|", B]` has a narrow that `.pick()` drops',
				'/main.ts:22:34  `[Dates, "@", "date range"]` has a narrow that `"..."` drops'
			])
		})

		it("handles tuple intersections in Required/Partial without false positives on runtime no-ops", () => {
			const source = `import { keywords, type } from "arktype"
${datesDecl}
const AllOpt = type({ "issued?": "string.date", "due?": "string.date" }).narrow(o => !!o)
const ReqExtra = type({ extra: "boolean" })
const OptExtra = type({ "extra?": "boolean" })
// runtime no-ops on tuple intersections -> 0 warnings
export const ReqInterNoop = keywords.Required([Dates, "&", ReqExtra])
export const PartInterNoop = keywords.Partial([AllOpt, "&", OptExtra])
// tuple intersections that actually drop -> warn
export const ReqInterDrop = keywords.Required([Dates, "&", OptExtra])
export const PartInterDrop = keywords.Partial([Dates, "&", ReqExtra])`
			attest(diagnosticsOf(source).map(d => d.split("\n")[0])).snap([
				'/main.ts:16:29  `[Dates, "&", OptExtra]` has a narrow that `.required()` drops',
				'/main.ts:17:30  `[Dates, "&", ReqExtra]` has a narrow that `.partial()` drops'
			])
		})

		it("warns on string-syntax structural generics in scope(), $.type(), and type.module()", () => {
			const source = `import { scope, type } from "arktype"
${datesDecl}
const AllOpt = type({ "issued?": "string.date", "due?": "string.date" }).narrow(o => !!o)
const Other = type({ x: "number" }).narrow(o => o.x > 0)
const $ = scope({
	dates: Dates,
	allOpt: AllOpt,
	other: Other,
	plain: { total: "number" },
	p: "Partial<dates>",
	k: "Pick<dates, 'issued'>",
	o: "Omit<dates, 'due'>",
	m: "Merge<dates, plain>",
	mb: "Merge<dates, other>",
	nested: "Partial<Pick<dates, 'issued'>>",
	union: "Partial<dates> | null",
	// runtime no-ops -> 0 warnings
	rNoop: "Required<dates>",
	pNoop: "Partial<allOpt>",
	// quoted string literal -> 0 warnings
	lit: "'Partial<dates>'"
})
export const out = $.export()
export const DirectPartial = $.type("Partial<dates>")
export const DirectNoop = $.type("Required<dates>")
export const Mod = type.module({
	dates: Dates,
	p: "Partial<dates>",
	r: "Required<dates>"
})
const $shadow = scope({
	dates: Dates,
	"Partial<t>": { wrapped: "t" },
	p: "Partial<dates>"
})
export const shadowOut = $shadow.export()`
			attest(diagnosticsOf(source).map(d => d.split("\n")[0])).snap([
				"/main.ts:16:2  `dates` has a narrow that `.partial()` drops",
				"/main.ts:17:2  `dates` has a narrow that `.pick()` drops",
				"/main.ts:18:2  `dates` has a narrow that `.omit()` drops",
				"/main.ts:19:2  `dates` has a narrow that `.merge()` drops",
				"/main.ts:20:2  `dates` has a narrow that `.merge()` drops",
				"/main.ts:20:2  `other` has a narrow that `.merge()` drops",
				"/main.ts:21:2  `dates` has a narrow that `.pick()` drops",
				"/main.ts:22:2  `dates` has a narrow that `.partial()` drops",
				"/main.ts:30:30  `dates` has a narrow that `.partial()` drops",
				"/main.ts:34:2  `dates` has a narrow that `.partial()` drops"
			])
		})

		it("handles partially-resolved scopes, private aliases, invalid unreferenced aliases, shadowed generic params, and tuple-property generics", () => {
			const source = `import { scope, type } from "arktype"
${datesDecl}
// partially-resolved scope where dates/p are still unresolved BaseParseContext in scope.res
const $partial = scope({
	dates: Dates,
	p: "Partial<dates>",
	other: "string"
})
export const Other = $partial.type("other")

// private #dates and #p in an exported scope
const $priv = scope({
	"#dates": Dates,
	"#p": "Partial<dates>",
	ok: "string"
})
export const privOut = $priv.export()

// unreferenced private alias with unsatisfiable intersection must not crash precompilation
const $unsat = scope({
	"#p": "Partial<true & false>",
	other: "string"
})
export const unsatOut = $unsat.export()

// scope generic parameter shadowing a scope alias must not false-positive
const $genShadow = scope({
	dates: Dates,
	"MyPartial<dates>": "Partial<dates>",
	"Constrained<dates extends object, k extends string>": "Pick<dates, k>",
	"SpreadGeneric<dates>": { "...": "dates", x: "number" }
})
export const genShadowOut = $genShadow.export()
export const StandaloneParamShadow = $genShadow.type("<dates>", "Partial<dates>")

// string generics inside tuple-valued properties report at the property line and respect suppression
const $tupleProp = scope({
	dates: Dates,
	a: ["Partial<dates>", "|", "null"],
	// @ark-allow-drop-narrow
	b: ["Partial<dates>", "|", "null"]
})
export const tuplePropOut = $tupleProp.export()`
			const result = analyze(source)
			attest(result.sites.every(s => s.status === "accepted")).equals(true)
			attest(diagnosticsOf(source).map(d => d.split("\n")[0])).snap([
				"/main.ts:12:2  `dates` has a narrow that `.partial()` drops",
				"/main.ts:20:2  `dates` has a narrow that `.partial()` drops",
				"/main.ts:45:2  `dates` has a narrow that `.partial()` drops"
			])
		})

		it("identifies destructured and aliased parser methods by function identity", () => {
			const source = `import { scope, type } from "arktype"
${datesDecl}
const { unit, enumerated, merge, or } = type
const $ = scope({ dates: Dates })
const { unit: sUnit, merge: sMerge } = $.type
const sm = $.type.merge
// unit/enumerated take values, not definitions -> 0 dropped-narrow warnings
export const U = unit({ "...": Dates })
export const E = enumerated({ "...": Dates })
export const SU = sUnit({ "...": Dates })
// destructured/aliased merge and or -> warn
export const M = merge(Dates, { total: "number" })
export const O = or({ "...": Dates }, "null")
export const SM = sMerge("dates", { total: "number" })
export const SMAlias = sm("dates", { total: "number" })`
			attest(
				analyze(source)
					.diagnostics.filter(d => d.rule === "dropped-narrow")
					.map(d => `${d.line}:${d.column}  ${d.message}`)
			).snap([
				"18:18  `Dates` has a narrow that `.merge()` drops",
				'19:23  `Dates` has a narrow that `"..."` drops',
				"20:19  `dates` has a narrow that `.merge()` drops",
				"21:24  `dates` has a narrow that `.merge()` drops"
			])
		})

		it("does not warn for operations that preserve root narrows", () => {
			const source = `import { type } from "arktype"
${datesDecl}
export const Intersected = Dates.and({ total: "number" })
export const Nullable = Dates.or("null")
export const Described = Dates.describe("valid date range")
export const Configured = Dates.configure({ description: "valid date range" })
export const Many = Dates.array()
export const Wrapped = type({ dates: Dates, total: "number" })`
			attest(diagnosticsOf(source)).equals([])
		})

		it("warns once in a chain and does not warn alongside a ParseError", () => {
			const source = `import { type } from "arktype"
${datesDecl}
// .merge() drops the narrow; .pick() sees an already-unnarrowed object
export const Chained = Dates.merge({ total: "number" }).pick("issued", "total")
// invalid key throws ParseError -> no dropped-narrow warning
export const BadPick = Dates.pick("nonexistent")
// morph + narrow throws ParseError on spread -> no dropped-narrow warning
const Defaulted = type({ issued: "string.date = '2026-01-01'", due: "string.date" }).narrow(d => d.due >= d.issued)
export const BadSpread = type({ "...": Defaulted, total: "number" })`
			const result = analyze(source)
			// BadPick and BadSpread threw ParseErrors and emitted no dropped-narrow warnings
			attest(result.sites.filter(s => s.parseError).map(s => s.line)).equals([
				12, 15
			])
			attest(
				result.diagnostics.map(d => `${d.line}:${d.rule}:${d.severity}`)
			).snap(["10:dropped-narrow:warning"])
		})
	})

	describe("directive suppression", () => {
		it("suppresses with // @ark-allow-drop-narrow in leading, property, chain, and trailing positions", () => {
			const source = `import { type } from "arktype"
${datesDecl}
// @ark-allow-drop-narrow
export const BeforeDecl = type({ "...": Dates, total: "number" })
// @ark-allow-drop-narrow date order is validated on submit
// intervening comment
export const WithReason = Dates.partial()
export const BeforeProp = type({
	// @ark-allow-drop-narrow
	"...": Dates,
	total: "number"
})
export const TrailingProp = type({
	"...": Dates, // @ark-allow-drop-narrow
	total: "number"
})
export const TrailingLine = Dates.omit("due") // @ark-allow-drop-narrow
export const ChainedLine = Dates
	// @ark-allow-drop-narrow
	.pick("issued")
// @ark-allow-drop-narrows
export const Misspelled = type({ "...": Dates, total: "number" })
export const Unsuppressed = Dates.merge({ total: "number" })`
			attest(diagnosticsOf(source).map(d => d.split("\n")[0])).snap([
				'/main.ts:28:34  `Dates` has a narrow that `"..."` drops',
				"/main.ts:29:29  `Dates` has a narrow that `.merge()` drops"
			])
		})

		it("does not over-suppress sibling properties, same-line statements, or subsequent chained methods", () => {
			const source = `import { type } from "arktype"
${datesDecl}
const Other = type({ y: "number" }).narrow(o => o.y > 0)
export const SiblingSameLine = type({
	// @ark-allow-drop-narrow
	a: { "...": Dates, x: "number" }, b: { "...": Dates, y: "number" }
})
// @ark-allow-drop-narrow
const ok = 1; export const SameLineStmt = Dates.pick("issued")
export const ChainTrailing = Dates.merge({ x: "number" }) // @ark-allow-drop-narrow
	.merge(Other)
export const EndBrace = Dates.and({
	total: "number"
	// @ark-allow-drop-narrow
}).pick("issued")
export const TrailingOnLaterChainMerge = Dates.pick("issued")
	.merge(Other) // @ark-allow-drop-narrow
export const TrailingOnLaterChainAnd = Dates.pick("issued")
	.and({ total: "number" }) // @ark-allow-drop-narrow`
			attest(diagnosticsOf(source).map(d => d.split("\n")[0])).snap([
				'/main.ts:12:41  `Dates` has a narrow that `"..."` drops',
				"/main.ts:15:43  `Dates` has a narrow that `.pick()` drops",
				"/main.ts:16:30  `Other` has a narrow that `.merge()` drops",
				'/main.ts:18:25  `Dates.and({ total: "number" // @ark-allow-drop-narrow })` has a narrow that `.pick()` drops',
				"/main.ts:22:42  `Dates` has a narrow that `.pick()` drops",
				"/main.ts:24:40  `Dates` has a narrow that `.pick()` drops"
			])
		})

		it("suppresses with // @ark-allow-drop-narrow: reason and /* @ark-allow-drop-narrow */ layouts without over-suppressing", () => {
			const source = `import { type } from "arktype"
${datesDecl}
// @ark-allow-drop-narrow: validated separately
export const ColonReason = type({ "...": Dates, total: "number" })
export const TrailingColonReason = Dates.omit("due") // @ark-allow-drop-narrow: partial update
/* @ark-allow-drop-narrow */
export const BlockLeading = type({ "...": Dates, total: "number" })
/* @ark-allow-drop-narrow: intentional drop */
export const BlockLeadingReason = Dates.partial()
export const BlockTrailing = Dates.pick("issued") /* @ark-allow-drop-narrow */
export const BlockInlineProp = type({ /* @ark-allow-drop-narrow */ "...": Dates, total: "number" })
export const BlockInlineMethod = Dates./* @ark-allow-drop-narrow */pick("issued")
export const BlockInlineSibling = type({
	a: { /* @ark-allow-drop-narrow */ "...": Dates, x: "number" }, b: { "...": Dates, y: "number" }
})
/* @ark-allow-drop-narrows */
export const BlockMisspelled = Dates.merge({ total: "number" })`
			attest(diagnosticsOf(source).map(d => d.split("\n")[0])).snap([
				'/main.ts:20:70  `Dates` has a narrow that `"..."` drops',
				"/main.ts:23:32  `Dates` has a narrow that `.merge()` drops"
			])
		})

		it("suppresses comment-after-dot, optional chaining, computed member, multiline trailing, local def trailing, and string generics", () => {
			const source = `import { scope, type } from "arktype"
${datesDecl}
export const AfterDot = Dates.
	// @ark-allow-drop-narrow
	pick("issued")
export const OptionalChain = Dates
	// @ark-allow-drop-narrow
	?.pick("issued")
export const ComputedMember = Dates
	// @ark-allow-drop-narrow
	["pick"]("issued")
export const MultilineTrailing = Dates.merge({
	total: "number"
}) // @ark-allow-drop-narrow
const def = { "...": Dates, total: "number" }
export const LocalDefTrailing = type(def) // @ark-allow-drop-narrow
const $ = scope({
	dates: Dates,
	// @ark-allow-drop-narrow
	p: "Partial<dates>",
	k: "Pick<dates, 'issued'>" // @ark-allow-drop-narrow
})
export const out = $.export()
export const DirectTrailing = $.type("Partial<dates>") // @ark-allow-drop-narrow`
			attest(diagnosticsOf(source)).equals([])
		})
	})

	describe("cross-module, helpers, cache mode, check, and eslint", () => {
		it("warns across modules only in the module dropping the narrow", () => {
			const files = {
				"/dates.ts": `import { type } from "arktype"\nexport ${datesDecl}`,
				"/invoice.ts": `import { type } from "arktype"\nimport { Dates } from "./dates.ts"\nexport const Invoice = type({ "...": Dates, total: "number" })`,
				"/app.ts": `import { type } from "arktype"\nimport { Invoice } from "./invoice.ts"\nexport const Order = type({ invoice: Invoice })`
			}
			attest(diagnosticsOf(files["/dates.ts"], files)).equals([])
			attest(
				diagnosticsOf(files["/invoice.ts"], files).map(d => d.split("\n")[0])
			).snap(['/main.ts:3:31  `Dates` has a narrow that `"..."` drops'])
			attest(diagnosticsOf(files["/app.ts"], files)).equals([])
		})

		it("warns when a static helper spreads a narrowed Type", () => {
			const source = `import { type } from "arktype"
${datesDecl}
const withTotal = (Base: typeof Dates) => type({ "...": Base, total: "number" })
export const Invoice = withTotal(Dates)`
			attest(diagnosticsOf(source)).snap([
				'/main.ts:10:24  `Base` has a narrow that `"..."` drops\n  `"...": Base` (/main.ts:9:50)\n  Derive from the base properties and apply .narrow() to the result, or put // @ark-allow-drop-narrow on the line before it if dropping it is intended.'
			])
		})

		it("preserves the dropped-narrow hint in runtime: 'arktype' (cache) mode", () => {
			const source = `import { type } from "arktype"
${datesDecl}
export const Invoice = type({ "...": Dates, total: "number" })`
			attest(
				analyze(source, {}, { runtime: "arktype" }).diagnostics.map(
					renderDiagnostic
				)
			).snap([
				'/main.ts:9:31  `Dates` has a narrow that `"..."` drops\n  Derive from the base properties and apply .narrow() to the result, or put // @ark-allow-drop-narrow on the line before it if dropping it is intended.'
			])
		})

		it("surfaces as a non-fatal warning in ark check", () => {
			const root = writeFixture({
				"dates.ts": `import { type } from "arktype"\nexport ${datesDecl}\n`,
				"invoice.ts": `import { type } from "arktype"\nimport { Dates } from "./dates.ts"\nexport const Invoice = type({ "...": Dates, total: "number" })\n`
			})
			const report = check([], { cwd: root })
			attest(report.errors).equals(0)
			attest(report.accepted).equals(2)
			attest(report.lines).snap([
				"dates.ts:2:22  accepted",
				"invoice.ts:3:24  accepted",
				'invoice.ts:3:31  `Dates` has a narrow that `"..."` drops\n  Derive from the base properties and apply .narrow() to the result, or put // @ark-allow-drop-narrow on the line before it if dropping it is intended.',
				"2 sites in 2 files: 2 accepted (100.0%)"
			])
		}).timeout(60_000)

		it("surfaces under @ark/aot/warnings in ESLint and respects suppression", () => {
			const dir = writeFixture({
				"dates.ts": `import { type } from "arktype"\nexport ${datesDecl}\n`,
				"invoice.ts": ""
			})
			const lintCode = (code: string, extra: Linter.Config[] = []) =>
				new Linter({ configType: "flat", cwd: dir })
					.verify(code, [configs.recommended, ...extra], {
						filename: join(dir, "invoice.ts")
					})
					.map(
						m =>
							`${m.line}:${m.column} ${m.ruleId} ${m.severity === 2 ? "error" : "warning"} ${m.message.split("\n")[0]}`
					)

			const warningCode = `import { type } from "arktype"\nimport { Dates } from "./dates.ts"\nexport const Invoice = type({ "...": Dates, total: "number" })\n`
			attest(lintCode(warningCode)).snap([
				'3:31 @ark/aot/warnings warning `Dates` has a narrow that `"..."` drops'
			])
			// turning off @ark/aot/warnings silences it
			attest(
				lintCode(warningCode, [{ rules: { "@ark/aot/warnings": "off" } }])
			).equals([])
			// per-line directive silences it
			const suppressedCode = `import { type } from "arktype"\nimport { Dates } from "./dates.ts"\n// @ark-allow-drop-narrow\nexport const Invoice = type({ "...": Dates, total: "number" })\n`
			attest(lintCode(suppressedCode)).equals([])
			// droppedNarrow: false option silences dropped-narrow while keeping @ark/aot/warnings enabled
			attest(
				lintCode(warningCode, [
					{ rules: { "@ark/aot/warnings": ["warn", { droppedNarrow: false }] } }
				])
			).equals([])
		}).timeout(60_000)

		it("silences dropped-narrow warnings when droppedNarrow: false is configured", () => {
			const source = `import { type } from "arktype"
${datesDecl}
export const Invoice = type({ "...": Dates, total: "number" })
export const Merged = Dates.merge({ total: "number" })`
			attest(analyze(source, {}, { droppedNarrow: false }).diagnostics).equals(
				[]
			)
			attest(
				analyze(source, {}, { runtime: "arktype", droppedNarrow: false })
					.diagnostics
			).equals([])

			// ark check with droppedNarrow: false option and ark.json
			const root = writeFixture({
				"package.json": "{}",
				"ark.json": JSON.stringify({ precompile: { droppedNarrow: false } }),
				"dates.ts": `import { type } from "arktype"\nexport ${datesDecl}\n`,
				"invoice.ts": `import { type } from "arktype"\nimport { Dates } from "./dates.ts"\nexport const Invoice = type({ "...": Dates, total: "number" })\n`
			})
			const report = check([], { cwd: root })
			attest(report.errors).equals(0)
			attest(report.diagnostics).equals([])
		}).timeout(60_000)

		it("does not warn when a generic parameter shadows an outer narrowed alias in tuple expressions", () => {
			const source = `import { scope } from "arktype"
const isValid = (o: object) => Object.keys(o).length > 0
const $ = scope({
	P: ["object", ":", isValid],
	"Box<P>": { "...": ["P", "&", { a: "string" }], extra: "number" }
})
export const out = $.export()`
			attest(diagnosticsOf(source)).equals([])
		})
	})
})
