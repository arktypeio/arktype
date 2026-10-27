import { attest, contextualize } from "@ark/attest"
import { hasArkKind, type BaseRoot } from "@ark/schema"
import { printDecimal } from "@ark/util"
import { ark, type } from "arktype"
import fc from "fast-check"

// random string definitions, each of whose expression must parse back to an
// equal Type with the same expression (#818)

// ARK_ROUND_TRIP=<runs>[:<seed>] pnpm testFiles ark/type/__tests__/roundTrip.test.ts --timeout 0
const [runs = 1000, seed = 1] =
	process.env.ARK_ROUND_TRIP?.split(":").map(Number) ?? []

// a string definition holds no props, tuples or morphs, and a predicate only
// by its keyword, as string.date's
const expressibleKinds = new Set([
	"union",
	"intersection",
	"domain",
	"unit",
	"proto",
	"divisor",
	"min",
	"max",
	"minLength",
	"maxLength",
	"exactLength",
	"after",
	"before",
	"pattern",
	"notEqual",
	"notEqualLength"
])

const keywordsOf = (module: object, prefix = ""): string[] =>
	Object.entries(module).flatMap(([k, v]) => {
		const name =
			k === "root" ? prefix
			: prefix ? `${prefix}.${k}`
			: k
		return (
			hasArkKind(v, "module") ? keywordsOf(v, name)
			: hasArkKind(v, "root") ? [name]
			: []
		)
	})

const keywords = keywordsOf(ark.export()).filter(name => {
	const node: BaseRoot = type(name as never).internal
	return [node, ...node.references].every(
		n =>
			expressibleKinds.has(n.kind) ||
			(n.kind === "predicate" && n.meta.keyword !== undefined)
	)
})

const keywordsIn = (domain: "number" | "string") =>
	keywords.filter(name => type(name as never).extends(domain))

const grouped = (def: string) => (/[ &|]/.test(def) ? `(${def})` : def)

const intersected = (def: fc.Arbitrary<string>) =>
	fc.oneof(
		{ weight: 3, arbitrary: def },
		fc.tuple(def, def).map(([l, r]) => `${grouped(l)} & ${grouped(r)}`)
	)

// a non-finite number is a unit, where a limit holding one is skipped
const numberLiteral = fc
	.oneof(fc.integer({ min: -12, max: 12 }), fc.double())
	.map(printDecimal)

const comparator = fc.constantFrom("<", "<=", ">", ">=", "==", "!=")

const leftComparator = fc.constantFrom("<", "<=")

const numberDef = intersected(
	fc.oneof(
		numberLiteral,
		fc
			.tuple(
				fc.constantFrom(...keywordsIn("number")),
				fc.option(fc.integer({ min: 1, max: 12 })),
				fc.option(fc.tuple(comparator, numberLiteral))
			)
			.map(
				([base, divisor, bound]) =>
					`${base}${divisor ? ` % ${divisor}` : ""}${bound ? ` ${bound[0]} ${bound[1]}` : ""}`
			),
		fc
			.tuple(numberLiteral, leftComparator, leftComparator, numberLiteral)
			.map(([l, lc, rc, r]) => `${l} ${lc} number ${rc} ${r}`)
	)
)

// a literal's expression escapes a control character, like JSON, but a string
// definition reads such an escape as written, so neither literal holds one
const stringLiteral = fc
	.tuple(fc.string({ maxLength: 4 }), fc.constantFrom("'", '"'))
	.map(
		([s, quote]) =>
			`${quote}${s.replace(/\\/g, "\\\\").replace(new RegExp(quote, "g"), `\\${quote}`)}${quote}`
	)

const regexLiteral = fc
	.array(
		fc.constantFrom(
			"a",
			"\\d",
			".",
			"[a-c]",
			"[\\/]",
			"\\/",
			"\\\\",
			"(?:ab)",
			"x*",
			"y+",
			"|",
			"^",
			"$",
			" ",
			"'"
		),
		{ maxLength: 5 }
	)
	.map(atoms => `/${atoms.join("")}/`)

const length = fc.integer({ min: 0, max: 5 })

const stringDef = intersected(
	fc.oneof(
		stringLiteral,
		fc
			.tuple(
				fc.oneof(fc.constantFrom(...keywordsIn("string")), regexLiteral),
				fc.option(fc.tuple(comparator, length))
			)
			.map(([base, bound]) =>
				bound ? `${base} ${bound[0]} ${bound[1]}` : base
			),
		fc
			.tuple(length, leftComparator, leftComparator, length)
			.map(([l, lc, rc, r]) => `${l} ${lc} string ${rc} ${r}`)
	)
)

const dateLiteral = fc
	.date({
		min: new Date("1960-01-01"),
		max: new Date("2100-01-01"),
		noInvalidDate: true
	})
	.chain(date =>
		fc.constantFrom(
			`d'${date.toISOString()}'`,
			`d"${date.toISOString().slice(0, 10)}"`,
			`d'${date.getTime()}'`
		)
	)

const dateLimit = fc.oneof(
	dateLiteral,
	fc.integer({ min: -9, max: 9 }).map(String)
)

const dateDef = intersected(
	fc.oneof(
		fc.constant("Date"),
		dateLiteral,
		fc
			.tuple(comparator, dateLimit)
			.map(([comparator, limit]) => `Date ${comparator} ${limit}`),
		fc
			.tuple(dateLimit, leftComparator, leftComparator, dateLimit)
			.map(([l, lc, rc, r]) => `${l} ${lc} Date ${rc} ${r}`)
	)
)

const otherDef = fc.oneof(
	fc.constantFrom(
		...keywords.filter(name => !type(name as never).extends("number | string"))
	),
	fc.bigInt({ min: -9n, max: 9n }).map(n => `${n}n`)
)

const defOf = fc.letrec<{ def: string; array: string }>(tie => ({
	def: fc.oneof(
		{ depthSize: "small", withCrossShrink: true },
		numberDef,
		stringDef,
		dateDef,
		otherDef,
		tie("array"),
		fc
			.tuple(tie("def"), tie("def"))
			.map(([l, r]) => `${grouped(l)} | ${grouped(r)}`),
		fc
			.tuple(tie("def"), tie("def"))
			.map(([l, r]) => `${grouped(l)} & ${grouped(r)}`)
	),
	array: intersected(
		fc.oneof(
			tie("def").map(element => `${grouped(element)}[]`),
			fc
				.tuple(
					fc.oneof(numberDef, stringDef, tie("array")),
					fc.tuple(comparator, length)
				)
				.map(
					([element, [comparator, length]]) =>
						`${grouped(element)}[] ${comparator} ${length}`
				)
		)
	)
})).def

// meta, like a keyword's description, has no string syntax. Union branches
// are ordered by hashes that include it, so it's left out of the order too.
// A predicate keeps its own, as its keyword is how it's written
const bare = (t: type.Any): BaseRoot =>
	t.internal.transform((kind, { meta, ...inner }) =>
		kind === "predicate" ? { meta, ...inner } : (inner as never)
	)

// a definition that's unsatisfiable is skipped
const parsedOrSkipped = (def: string): BaseRoot => {
	try {
		return bare(type(def as never))
	} catch {
		return fc.pre(false) as never
	}
}

const assertRoundTrip = (check: (def: string, node: BaseRoot) => void) =>
	fc.assert(
		fc.property(defOf, def => {
			check(def, parsedOrSkipped(def))
		}),
		{ numRuns: runs, seed }
	)

const reparsed = (node: BaseRoot) => bare(type.raw(node.expression))

contextualize(() => {
	it("an expression is its own expression", () => {
		assertRoundTrip((def, node) =>
			attest({ def, expression: reparsed(node).expression }).equals({
				def,
				expression: node.expression
			})
		)
	})

	it("an expression parses to the Type it was written from", () => {
		assertRoundTrip((def, node) =>
			attest({ def, json: reparsed(node).json }).equals({
				def,
				json: node.json
			})
		)
	})
})
