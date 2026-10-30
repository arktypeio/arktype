import {
	ArkErrors,
	registerPrecompiledUnits,
	writePrecompiledUnits,
	type BaseRoot,
	type PrecompiledUnit,
	type Traversal
} from "@ark/schema"
import { scope, type type } from "arktype"
import { deepStrictEqual, strictEqual } from "node:assert/strict"

// imported as a module, so registering evaluates no string under a Content-Security-Policy
export const precompileUnits = async (
	types: readonly type.Any[]
): Promise<Record<string, PrecompiledUnit>> => {
	const written = writePrecompiledUnits(types.map(t => t.internal))
	const source = `export default {${Object.entries(written).map(([key, unit]) => `\n${JSON.stringify(key)}: ${unit}`)}\n}`
	const units = (
		await import(`data:text/javascript,${encodeURIComponent(source)}`)
	).default
	registerPrecompiledUnits(units)
	return units
}

// a loop, since how many units are searched before the match varies with
// what ran before, so a callback's count would too
export const isPrecompiled = (
	units: Record<string, PrecompiledUnit>,
	root: BaseRoot
): boolean => {
	for (const key in units) if (units[key][1] === root.unitFn) return true
	return false
}

export const observe = (t: type.Any, data: unknown): unknown => {
	const out = t(data)
	return out instanceof ArkErrors ?
			{
				summary: out.summary,
				errors: out.issues.map(e => [JSON.stringify(e), e.propString])
			}
		:	{ out }
}

class Point {
	x = 0
}

const isEven = (n: number, ctx: Traversal) => n % 2 === 0 || ctx.mustBe("even")

const sym = Symbol("precompiledCorpus")

const unitObject = { precompiled: true }

export const corpus: [def: unknown, inputs: () => unknown[]][] = [
	[
		{
			k: "string",
			n: "number > 5",
			u: "'a'|'b'|'c'",
			arr: "string[]",
			nested: { x: "string.email", y: "number.integer" }
		},
		() => [
			{ k: "a", n: 6, u: "a", arr: ["x"], nested: { x: "a@b.co", y: 1 } },
			{ k: 1, n: 5, u: "d", arr: [1], nested: { x: "x", y: 1.5 } },
			{ nested: null },
			5
		]
	],
	[
		[
			{ kind: "'circle'", radius: "number >= 0" },
			"|",
			{ kind: "'square'", side: "number" }
		],
		() => [
			{ kind: "circle", radius: 1 },
			{ kind: "square", side: "x" },
			{ kind: "triangle" },
			{}
		]
	],
	[
		"string | number[] | null | Date",
		() => ["a", [1, "2"], null, new Date(0), {}]
	],
	[
		{ n: "string.numeric.parse", d: "string.date.iso.parse", t: "string.trim" },
		() => [
			{ n: "5", d: "2000-01-01T00:00:00.000Z", t: " x " },
			{ n: "x", d: "never", t: 1 }
		]
	],
	[["number", ":", isEven], () => [2, 3, "2"]],
	[
		{ a: "string = 'x'", b: ["number[]", "=", () => []], "c?": "boolean" },
		() => [{}, { a: 1, b: [1], c: 0 }, { a: "y", c: true }]
	],
	[
		["string", "number = 5", "...", "boolean[]"],
		() => [["a"], ["a", 1, true, false], ["a", "1", 0], []]
	],
	[
		{ "+": "reject", "[/^x/]": "number", a: "string" },
		() => [
			{ a: "a", x1: 1 },
			{ a: "a", x1: "1", b: 2 }
		]
	],
	[{ "+": "delete", a: "string" }, () => [{ a: "a", b: 1 }, { b: 1 }]],
	[{ [sym]: "string" }, () => [{ [sym]: "a" }, { [sym]: 1 }, {}]],
	[
		"Date >= d'2000-01-01T00:00:00.000Z'",
		() => [new Date("2001-01-01T00:00:00.000Z"), new Date(0), "2001"]
	],
	["/^[a-z]+$/ & string <= 5", () => ["abc", "abcdef", "ABC", 1]],
	["number % 3", () => [9, 10]],
	[
		{ n: "number != 0", s: "string != 2", d: "Date != d'2000-05-03'" },
		() => [
			{ n: 1, s: "a", d: new Date(0) },
			{ n: 0, s: "ab", d: new Date("2000-05-03T00:00:00.000Z") }
		]
	],
	[["instanceof", Point], () => [new Point(), {}]],
	[["===", unitObject], () => [unitObject, { precompiled: true }]],
	[["string", "=>", (s: string) => s.length], () => ["abc", 1]],
	[
		{ items: [{ id: "number", tags: "string[]" }, "[]"] },
		() => [
			{ items: [{ id: 1, tags: [] }] },
			{ items: [{ id: "1", tags: [1] }, null] }
		]
	]
]

// each corpus Type binds its unit and observes data as reference's does
export const assertMatchesCorpus = (
	units: Record<string, PrecompiledUnit>,
	reference: type.Any[]
): void => {
	for (let i = 0; i < corpus.length; i++) {
		const T = scope({}).type(corpus[i][0] as never)
		strictEqual(isPrecompiled(units, T.internal), true)
		const referenceInputs = corpus[i][1]()
		for (const [j, data] of corpus[i][1]().entries()) {
			deepStrictEqual(
				observe(T, data),
				observe(reference[i], referenceInputs[j])
			)
		}
	}
}
