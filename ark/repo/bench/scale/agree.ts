// Whether an app synth.ts wrote is the same app in each library: every schema
// of each is given values it should accept and values it shouldn't, and the
// four must answer alike. A library missing a check would ship less for it,
// so sizeScale.ts runs this before it measures.
//
// The values are read off Valibot's schemas, the only ones that say what
// they're made of without their library's internals: for each schema, one
// that satisfies it, then that one with each key in turn of the wrong type,
// then with every plain string or every number replaced by one a narrow may
// reject.
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

// a value the schema accepts, but for a narrow, or with the key at `broken` of
// a type it doesn't
const valueOf = (
	schema: Shape,
	broken: string | undefined,
	path: string
): unknown => {
	const isBroken = broken === path
	switch (schema.type) {
		case "object":
			return Object.fromEntries(
				Object.entries(schema.entries!).map(([key, entry]) => [
					key,
					valueOf(
						entry.type === "optional" ? entry.wrapped! : entry,
						broken,
						`${path}.${key}`
					)
				])
			)
		case "variant":
			return valueOf(schema.options![0] as Shape, broken, path)
		case "nullable":
			return isBroken ? 5 : valueOf(schema.wrapped!, broken, path)
		case "array":
			return isBroken ? plain : [valueOf(schema.item!, broken, `${path}[]`)]
		case "picklist":
			return isBroken ? "none of them" : schema.options![0]
		case "literal":
			return schema.literal
		case "boolean":
			return isBroken ? "yes" : true
		case "number": {
			const min = schema.pipe?.find(action => action.type === "min_value")
			// a multiple of each step a narrow may ask for
			return isBroken ? "1" : Math.max((min?.requirement as number) ?? 0, 100)
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
	/** how many values every library accepted and how many every one rejected */
	accepted: number
	rejected: number
}

/**
 * Checks the app in `dir` and returns how many values its schemas were given,
 * throwing at the first that one library accepts and another rejects
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
	const result = { accepted: 0, rejected: 0 }
	for (const name of Object.keys(valibot)) {
		const schema: Shape = valibot[name]
		const valid = valueOf(schema, undefined, "")
		const values = [
			valid,
			{},
			null,
			...keysOf(schema).map(key => valueOf(schema, `.${key}`, "")),
			...narrowed.map(by => replaced(valid, by))
		]
		for (const value of values) {
			// each its own copy, as a default is written into what's validated
			const answers: Record<SynthLibrary, boolean> = {
				arktype: arktype[name].allows(structuredClone(value)),
				valibot: v.is(valibot[name], structuredClone(value)),
				zod: zod[name].safeParse(structuredClone(value)).success,
				zodMini: z.safeParse(zodMini[name], structuredClone(value)).success
			}
			if (new Set(Object.values(answers)).size > 1) {
				throw new Error(
					`${name} in ${dir} isn't one schema in each library: given ${JSON.stringify(value)}, whether each accepts it is ${JSON.stringify(answers)}`
				)
			}
			result[answers.arktype ? "accepted" : "rejected"]++
		}
	}
	return result
}
