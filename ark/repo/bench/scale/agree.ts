// Whether an app synth.ts wrote is the same app in each library, and one that
// runs: it imports each library's modules, which creates every schema, ArkType
// dynamically, and gives each schema values it should accept and values it
// shouldn't. The four must answer alike, and all must accept the ones made to
// be valid. A library missing a check would ship less for it, and sizing
// bundles runs none of them, so sizeScale.ts runs this on every app it sizes:
// a definition ArkType throws on, like a default its own narrow rejects, fails
// here and not in a reader's build.
//
// The values are read off Valibot's schemas, the only ones that say what
// they're made of without their library's internals. For each schema: one
// that satisfies it, that one without its optional keys, so each library
// fills in its defaults, then with each key in turn of the wrong type, then
// with every plain string or every number replaced by one a narrow may reject.
//
// usage: node ark/repo/bench/scale/agree.ts <an app's directory>
import { type } from "arktype"
import { join } from "node:path"
import type { SynthLibrary } from "./synth.ts"

/** what this reads of a Valibot schema */
type Shape = {
	type: string
	entries?: Record<string, Shape>
	options?: unknown[]
	wrapped?: Shape
	item?: Shape
	literal?: unknown
	pipe?: Action[]
}

type Action = { type: string; requirement?: unknown }

type Valibot = typeof import("valibot")

// what satisfies each of synth.ts's patterns, by its source
const matches: Record<string, string> = {
	"^[A-Z]{2}$": "US",
	"^\\d{4}$": "1234",
	"^#[\\da-f]{6}$": "#00ff00",
	"^[\\da-z]+(?:-[\\da-z]+)*$": "ab-cd",
	"^\\+?\\d{7,15}$": "+15551234567",
	"^[A-Z]{3}-\\d{4}$": "ABC-1234",
	"^\\d{5}(?:-\\d{4})?$": "12345",
	"^[A-Z]{2}\\d{2}[\\dA-Z]{11,30}$": "GB29NWBK60161331926819"
}

const plain = "hello"

const stringOf = (actions: Action[]): string => {
	const kinds = actions.map(action => action.type)
	if (kinds.includes("email")) return "a@b.co"
	if (kinds.includes("uuid")) return "0b4c7d2e-8f1a-4b3c-9d5e-6f7a8b9c0d1e"
	if (kinds.includes("url")) return "https://example.com/x"
	if (kinds.includes("iso_timestamp")) return "2026-01-02T03:04:05.000Z"
	const pattern = actions.find(action => action.type === "regex")
	return pattern ? matches[(pattern.requirement as RegExp).source] : plain
}

// the first is a multiple of every step a narrow asks for, and the rest are
// within a smaller maximum
const numbers = [100, 50, 10, 5, 0, 1]

/** how a value is made: the key to give the wrong type, and whether optional keys are left out */
type Making = {
	v: Valibot
	broken?: string
	required?: boolean
}

// a value the schema accepts, or with the key at `broken` of a type it doesn't
const valueOf = (schema: Shape, making: Making, path: string): unknown => {
	const isBroken = making.broken === path
	switch (schema.type) {
		case "object":
			return Object.fromEntries(
				Object.entries(schema.entries!).flatMap(([key, entry]) =>
					entry.type !== "optional" ?
						[[key, valueOf(entry, making, `${path}.${key}`)]]
					: making.required ? []
					: [[key, valueOf(entry.wrapped!, making, `${path}.${key}`)]]
				)
			)
		case "variant":
			return valueOf(schema.options![0] as Shape, making, path)
		case "nullable":
			return isBroken ? 5 : valueOf(schema.wrapped!, making, path)
		case "array":
			return isBroken ? plain : [valueOf(schema.item!, making, `${path}[]`)]
		case "picklist":
			return isBroken ? "none of them" : schema.options![0]
		case "literal":
			return schema.literal
		case "boolean":
			return isBroken ? "yes" : true
		case "number": {
			if (isBroken) return "1"
			// its bounds and any narrow are Valibot's to say
			const value = numbers.find(n => making.v.is(schema as never, n))
			if (value === undefined)
				throw new Error(`no integer satisfies the field at ${path}`)
			return value
		}
		case "string":
			return isBroken ? 5 : stringOf(schema.pipe ?? [])
	}
	throw new Error(`agree.ts doesn't read a ${schema.type} at ${path}`)
}

const keysOf = (schema: Shape): string[] =>
	schema.type === "variant" ? keysOf(schema.options![0] as Shape)
	: schema.entries ? Object.keys(schema.entries)
	: []

// strings and numbers synth.ts's narrows reject, each by one of them. None is
// an integer past 2 ** 53, the one value the libraries are known to split on:
// Zod's int is a safe integer, where arktype's and Valibot's is any integer,
// as in the homepage's apps.
const narrowed = [
	"  ",
	" x",
	"a\nb",
	"a\u0007b",
	"_x",
	"-x",
	".x",
	"#x",
	"admin",
	"Root",
	"system",
	"support",
	"null",
	"test",
	"a  b",
	"<",
	"a://b",
	"x@y",
	3,
	105
]

const replaced = (value: unknown, by: string | number): unknown =>
	value === plain && typeof by === "string" ? by
	: typeof value === "number" && typeof by === "number" ? by
	: Array.isArray(value) ? value.map(item => replaced(item, by))
	: value && typeof value === "object" ?
		Object.fromEntries(
			Object.entries(value).map(([key, item]) => [key, replaced(item, by)])
		)
	:	value

export type Agreement = {
	/** the schemas each library created */
	schemas: number
	/** how many values every library accepted and how many every one rejected */
	accepted: number
	rejected: number
}

/** a value a schema is given, and whether it's one made to satisfy it */
type Case = {
	value: unknown
	valid?: boolean
}

/**
 * Creates the app in `dir` in each library and returns how many values its
 * schemas were given, throwing where creating one throws, at the first value
 * one library accepts and another rejects, and at one made to be valid that
 * any rejects
 */
export const agreementOf = async (dir: string): Promise<Agreement> => {
	const load = (library: SynthLibrary) => import(join(dir, `${library}.ts`))
	const [arktype, valibot, zod, zodMini] = await Promise.all([
		load("arktype"),
		load("valibot"),
		load("zod"),
		load("zodMini")
	])
	const v = await import("valibot")
	const z = await import("zod/mini")
	const names = Object.keys(valibot)
	const result = { schemas: names.length, accepted: 0, rejected: 0 }
	for (const name of names) {
		const schema: Shape = valibot[name]
		const valid = valueOf(schema, { v }, "")
		const cases: Case[] = [
			{ value: valid, valid: true },
			{ value: valueOf(schema, { v, required: true }, ""), valid: true },
			{ value: {} },
			{ value: null },
			...keysOf(schema).map(key => ({
				value: valueOf(schema, { v, broken: `.${key}` }, "")
			})),
			...narrowed.map(by => ({ value: replaced(valid, by) }))
		]
		for (const { value, valid } of cases) {
			// each its own copy, as a default is written into what's validated
			const answers: Record<SynthLibrary, boolean> = {
				arktype: !(
					arktype[name](structuredClone(value)) instanceof type.errors
				),
				valibot: v.safeParse(valibot[name], structuredClone(value)).success,
				zod: zod[name].safeParse(structuredClone(value)).success,
				zodMini: z.safeParse(zodMini[name], structuredClone(value)).success
			}
			const accepting = Object.values(answers).filter(Boolean).length
			if (accepting % 4 || (valid && !accepting)) {
				throw new Error(
					`${name} in ${dir} ${valid ? "should accept" : "isn't one schema in each library: given"} ${JSON.stringify(value)}, and whether each accepts it is ${JSON.stringify(answers)}`
				)
			}
			result[accepting ? "accepted" : "rejected"]++
		}
	}
	return result
}

if (process.argv[1] === import.meta.filename)
	console.log(JSON.stringify(await agreementOf(process.argv[2])))
