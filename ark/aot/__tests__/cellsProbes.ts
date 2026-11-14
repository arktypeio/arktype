// fixed programs testCellsFuzz runs on each host, for what a usage analysis
// decides from how a program reads its validators: each is its own program, as
// one read the analysis can't follow keeps everything for all of them.
// ARK_CELLS_FUZZ=probes[:<name prefix>] pnpm testCellsFuzz

const lib = {
	"node_modules/lib/package.json": `{ "name": "lib", "type": "module", "exports": "./index.js" }\n`,
	"node_modules/lib/index.js": `export const same = (x, y) => x === y
export const log = e => [e.summary, e.count, e.issues?.map(i => [i.path, i.message])]
export const register = t => {
	const seen = (globalThis.__registered ??= [])
	seen.push(t)
	return seen.filter(x => x === t).length
}
`
}

const observing = `const observations: unknown[] = []
const observe = (f: () => unknown) => {
	try {
		observations.push(f())
	} catch (e) {
		observations.push({ threw: String((e as Error)?.message ?? e) })
	}
}
`

const printing = `console.log(
	JSON.stringify(observations, (_, v) =>
		typeof v === "function" ? "function"
		: typeof v === "bigint" ? String(v)
		: v === undefined ? "undefined"
		: v
	)
)
`

// equal Types two modules create, which arktype returns as one
const twins = [
	`type({ a: "string" })`,
	`type("string.email")`,
	`type("string | number[]")`,
	`type({ a: "string | null" })`,
	`type("string.ip")`,
	`type({ kind: "'a'", x: "string" }).or({ kind: "'b'", y: "number" })`,
	// holding a function, which a module alone holds through a cell
	`type(["number", ":", positive])`,
	`type(["string", "=>", double])`,
	`type("string.numeric.parse")`,
	`type({ a: "string.numeric.parse" })`
]

// named past a minifier, as an expression and a message print a function's name
const preds = `export const positive = (d: any) => typeof d !== "number" || d > 0
export const double = (d: any) => (typeof d === "number" ? d * 2 : d)
Object.defineProperty(positive, "name", { value: "positive" })
Object.defineProperty(double, "name", { value: "double" })
`

// each module of an identity probe writing a twin imports what twins hold
const withPreds = (
	probes: Record<string, Record<string, string>>
): Record<string, Record<string, string>> =>
	Object.fromEntries(
		Object.entries(probes).map(([name, files]) => [
			name,
			{
				...Object.fromEntries(
					Object.entries(files).map(([file, text]) => [
						file,
						file.endsWith(".ts") && /\b(?:positive|double)\b/.test(text) ?
							`import { double, positive } from "./preds.ts"\n${text}`
						:	text
					])
				),
				"preds.ts": preds
			}
		])
	)

const twinsIn = (prefix: string, exported = true) =>
	twins
		.map((def, i) => `${exported ? "export " : ""}const ${prefix}${i} = ${def}`)
		.join("\n")

// each compares A with B however code can, where $A and $B are the two
const comparisons: Record<string, string> = {
	strict: `$A === $B`,
	strictThenMember: `[$A === $B, $B.expression]`,
	objectIsThenMember: `[Object.is($A, $B), $A.description]`,
	set: `new Set([$A, $B]).size`,
	mapKey: `new Map<unknown, number>([[$A, 1]]).get($B)`,
	includes: `[$A].includes($B)`,
	indexOf: `[$A as unknown].indexOf($B)`,
	objectIs: `Object.is($A, $B)`,
	weakMap: `(() => { const w = new WeakMap<object, number>(); w.set($A, 1); return w.get($B) })()`,
	weakSet: `new WeakSet<object>([$A]).has($B)`,
	dependency: `same($A, $B)`,
	switch: `(() => { switch ($B as unknown) { case $A: return "one"; default: return "apart" } })()`,
	reduce: `[$A as unknown, $B].reduce((x, y) => x === y)`,
	destructured: `(([x, y]: unknown[]) => x === y)([$A, $B])`,
	keyed: `({ [String($A.expression)]: $A } as any)[String($B.expression)] === $B`,
	json: `$A.json === $B.json`,
	in: `$A.in === $B.in`,
	out: `$A.out === $B.out`,
	internal: `($A as any).internal === ($B as any).internal`,
	array: `$A.array() === $B.array()`,
	or: `$A.or("null") === $B.or("null")`,
	describe: `$A.describe("x") === $B.describe("x")`,
	allows: `$A.allows === $B.allows`,
	standard: `$A["~standard"] === $B["~standard"]`,
	meta: `$A.meta === $B.meta`,
	toJsonSchema: `$A.toJsonSchema() === $B.toJsonSchema()`,
	description: `$A.description === $B.description`
}

const identityProbes = Object.fromEntries(
	Object.entries(comparisons).map(([name, comparison]) => [
		`identity ${name}`,
		{
			...lib,
			"a.ts": `import { type } from "arktype"\n${twinsIn("A")}\n`,
			"main.ts": `import { type } from "arktype"
import { same } from "lib"
${twins.map((_, i) => `import { A${i} } from "./a.ts"`).join("\n")}
${twinsIn("B", false)}
${observing}
${twins.map((_, i) => `observe(() => ${comparison.split("$A").join(`A${i}`).split("$B").join(`B${i}`)})`).join("\n")}
${printing}`
		}
	])
)

// handoffs where neither module compares what it creates itself
const handoffProbes: Record<string, Record<string, string>> = {
	"identity holder": {
		"a.ts": `import { type } from "arktype"\n\nexport const hold = { t: [${twins.join(", ")}] }\n`,
		"b.ts": `import { type } from "arktype"\n\nexport const box = [${twins.join(", ")}]\n`,
		"c.ts": `import { hold } from "./a.ts"\nimport { box } from "./b.ts"\n\nexport const same = hold.t.map((t, i) => t === box[i])\n`,
		"main.ts": `import { same } from "./c.ts"\nconsole.log(JSON.stringify(same))\n`
	},
	"identity registry": {
		"registry.ts": `export const registry: unknown[] = []\n`,
		"a.ts": `import { type } from "arktype"\nimport { registry } from "./registry.ts"\n\nregistry.push(${twins.join(", ")})\n`,
		"b.ts": `import { type } from "arktype"\nimport { registry } from "./registry.ts"\n\nregistry.push(${twins.join(", ")})\n`,
		"main.ts": `import "./a.ts"\nimport "./b.ts"\nimport { registry } from "./registry.ts"\n\nconst n = registry.length / 2\nconsole.log(JSON.stringify(registry.slice(0, n).map((t, i) => t === registry[n + i])))\n`
	},
	"identity global": {
		"a.ts": `import { type } from "arktype"\n\n;(globalThis as any).seen = [${twins.join(", ")}]\n`,
		"b.ts": `import { type } from "arktype"\n\nexport const same = [${twins.join(", ")}].map((t, i) => t === (globalThis as any).seen[i])\n`,
		"main.ts": `import "./a.ts"\nimport { same } from "./b.ts"\nconsole.log(JSON.stringify(same))\n`
	},
	"identity dependency registers": {
		...lib,
		"a.ts": `import { type } from "arktype"\nimport { register } from "lib"\n\nexport const counts = [${twins.join(", ")}].map(register)\n`,
		"b.ts": `import { type } from "arktype"\nimport { register } from "lib"\n\nexport const counts = [${twins.join(", ")}].map(register)\n`,
		"main.ts": `import { counts as a } from "./a.ts"\nimport { counts as b } from "./b.ts"\nconsole.log(JSON.stringify([a, b]))\n`
	},
	"identity namespace": {
		"a.ts": `import { type } from "arktype"\n${twinsIn("A")}\n`,
		"main.ts": `import { type } from "arktype"\nimport * as a from "./a.ts"\n${twinsIn("B", false)}\nconst bs: unknown[] = [${twins.map((_, i) => `B${i}`).join(", ")}]\nconsole.log(JSON.stringify(Object.values(a).map((t, i) => t === bs[i])))\n`
	},
	"identity dynamic": {
		"a.ts": `import { type } from "arktype"\n${twinsIn("A")}\n`,
		"main.ts": `import { type } from "arktype"\n${twinsIn("B", false)}\nconst a = await import("./a.ts")\nconsole.log(JSON.stringify([${twins.map((_, i) => `a.A${i} === B${i}`).join(", ")}]))\n`
	},
	"identity map holder": {
		"a.ts": `import { type } from "arktype"\n\nexport const byIndex = new Map([${twins.map((def, i) => `[${i}, ${def}]`).join(", ")}])\n`,
		"main.ts": `import { type } from "arktype"\nimport { byIndex } from "./a.ts"\n${twinsIn("B", false)}\nconsole.log(JSON.stringify([${twins.map((_, i) => `byIndex.get(${i}) === B${i}`).join(", ")}]))\n`
	},
	"identity called only, compared elsewhere": {
		"a.ts": `import { type } from "arktype"\n${twinsIn("A")}\nexport const checked = [${twins.map((_, i) => `String(A${i}({}))`).join(", ")}]\n`,
		"b.ts": `import { type } from "arktype"\n${twinsIn("B")}\n`,
		"main.ts": `import * as a from "./a.ts"\nimport * as b from "./b.ts"\nconsole.log(JSON.stringify([${twins.map((_, i) => `(a as any).A${i} === (b as any)["B" + ${i}]`).join(", ")}]))\n`
	}
}

// what can fail, unions among them, and data each fails differently. None
// reads a callback's ctx or morphs, either of which keeps the errors whole for
// the whole program
const failing = [
	`type({ a: "string", b: "number" })`,
	`type({ a: "string | null" })`,
	`type("string.ip")`,
	`type("string | number[]")`,
	`type({ kind: "'a'", x: "string" }).or({ kind: "'b'", y: "number" })`,
	`type({ nested: { deep: "string.email | null" } })`,
	`type("(string | number)[]")`,
	`type({ a: "number | null" }).narrow(o => o.a !== 5)`
]

// what keeps errors whole, each in a program of its own
const wholeKeeping: Record<string, string> = {
	piped: `type({ a: "string | number" }).pipe(o => o)`,
	morphed: `type("string.numeric.parse | number")`
}

const ctxNarrow = `type({ a: "number | null" }).narrow((o, ctx) => o.a !== 5 || ctx.reject("not five"))`

const inputs = [
	`{}`,
	`{ a: 1, b: "x" }`,
	`5`,
	`null`,
	`"1.2.3"`,
	`{ kind: "b", y: "x" }`,
	`[true]`,
	`{ nested: { deep: 5 } }`,
	`{ a: 5 }`,
	`"abc"`
]

// each reads `out`, a call's result, and pushes what it read: each the way a
// program handles errors, past the test the analysis follows or not at all
const errorReads: Record<string, string> = {
	summary: `if (out instanceof type.errors) observations.push(out.summary)\nelse observations.push("ok")`,
	issues: `if (out instanceof type.errors) observations.push(out.issues.map(i => [i.path, i.message, i.code, String(i)]))\nelse observations.push("ok")`,
	count: `observations.push(out instanceof type.errors ? out.count : "ok")`,
	issuesTernary: `observations.push(out instanceof type.errors ? out.issues[0].message : "ok")`,
	negated: `if (!(out instanceof type.errors)) observations.push("ok")\nelse observations.push(out.summary)`,
	earlyReturn: `observations.push((() => {\n\tif (!(out instanceof type.errors)) return "ok"\n\treturn [out.issues.length, out.summary]\n})())`,
	string: `observations.push(out instanceof type.errors ? String(out) : "ok")`,
	template: `observations.push(out instanceof type.errors ? \`\${out}\` : "ok")`,
	toStringCall: `observations.push(out instanceof type.errors ? out.toString() : "ok")`,
	throw: `if (out instanceof type.errors) out.throw()\nobservations.push("ok")`,
	json: `observations.push(JSON.stringify(out))`,
	toJSON: `observations.push(out instanceof type.errors ? out.toJSON() : "ok")`,
	spread: `observations.push(out instanceof type.errors ? [...out].map(i => i.message) : "ok")`,
	map: `observations.push(out instanceof type.errors ? out.map(i => i.path.join(".")) : "ok")`,
	byPath: `observations.push(out instanceof type.errors ? [Object.keys(out.byPath), Object.keys(out.flatByPath), out.flatProblemsByPath] : "ok")`,
	length: `observations.push(out instanceof type.errors ? out.length : "ok")`,
	index: `observations.push(out instanceof type.errors ? [out[0].message, out[0].propString, out[0].path.stringify()] : "ok")`,
	destructure: `if (out instanceof type.errors) {\n\tconst { summary, count } = out\n\tobservations.push([summary, count])\n} else observations.push("ok")`,
	untested: `observations.push((out as any)?.summary ?? "ok")`,
	duck: `observations.push("issues" in (out as any) ? (out as any).issues.length : "ok")`,
	isArray: `observations.push(Array.isArray(out))`,
	isError: `observations.push(out instanceof Error)`,
	aliased: `const E = type.errors\nobservations.push(out instanceof E ? out.summary : "ok")`,
	imported: `observations.push(out instanceof ArkErrors ? out.summary : "ok")`,
	logger: `observations.push(out instanceof type.errors ? log(out) : "ok")`,
	held: `results.push(out)\nobservations.push(readHeld())`,
	message: `observations.push(out instanceof type.errors ? (out as any).message : "ok")`,
	constructed: `observations.push(String(new type.errors()), String(new ArkErrors()))`
}

const errorProbes = Object.fromEntries(
	Object.entries(errorReads).map(([name, read]) => {
		const cases = failing.flatMap((_, i) =>
			inputs.map(
				input => `{
	const out = T${i}(${input} as any)
	try {
${read
	.split("\n")
	.map(line => `\t\t${line}`)
	.join("\n")}
	} catch (e) {
		observations.push({ threw: String((e as Error)?.message ?? e) })
	}
}`
			)
		)
		return [
			`errors ${name}`,
			{
				...lib,
				"held.ts": `import { type } from "arktype"\n\nexport const results: unknown[] = []\nexport const readHeld = () => results.map(r => (r instanceof type.errors ? r.summary : "ok")).slice(-1)\n`,
				"main.ts": `import { ArkErrors, type } from "arktype"
import { log } from "lib"
import { readHeld, results } from "./held.ts"

${failing.map((def, i) => `const T${i} = ${def}`).join("\n")}
${observing}
${cases.join("\n")}
${printing}`
			}
		]
	})
)

// Standard Schema, assert and a callback's ctx, which keep errors whole
const errorWholes: Record<string, string> = {
	assert: `observations.push((() => {\n\ttry {\n\t\tT$.assert(INPUT)\n\t\treturn "ok"\n\t} catch (e) {\n\t\treturn [(e as any).message, (e as any).arkErrors?.summary, e instanceof Error]\n\t}\n})())`,
	standard: `observations.push((() => {\n\tconst r = T$["~standard"].validate(INPUT) as any\n\treturn r.issues ? r.issues.map((i: any) => [i.message, i.path]) : "ok"\n})())`
}

const wholeProbes = Object.fromEntries(
	Object.entries(errorWholes).map(([name, read]) => [
		`errors ${name}`,
		{
			"main.ts": `import { type } from "arktype"

${failing.map((def, i) => `const T${i} = ${def}`).join("\n")}
${observing}
${failing
	.flatMap((_, i) =>
		inputs.map(input =>
			read.split("T$").join(`T${i}`).split("INPUT").join(`${input} as any`)
		)
	)
	.join("\n")}
${printing}`
		}
	])
)

// a program creating its Types with arktype's own `type`, and reaching its
// errors class through a project's module re-exporting arktype's
const errorBarrels: Record<
	string,
	[barrel: string, imported: string, errors: string]
> = {
	named: [
		`export { type, ArkErrors } from "arktype"`,
		`{ type as t, ArkErrors as E }`,
		"t.errors"
	],
	renamed: [
		`export { type as arkType } from "arktype"`,
		`{ arkType }`,
		"arkType.errors"
	],
	star: [`export * from "arktype"`, `{ ArkErrors as E }`, "E"],
	starAs: [`export * as ark from "arktype"`, `{ ark }`, "ark.ArkErrors"],
	reexported: [`export { E } from "./inner.ts"`, `{ E }`, "E"]
}

const errorBarrelReads: Record<string, string> = {
	summary: `observations.push(out instanceof ERRORS ? out.summary : "ok")`,
	string: `observations.push(out instanceof ERRORS ? String(out) : "ok")`,
	issues: `observations.push(out instanceof ERRORS ? out.issues.map((i: any) => i.message) : "ok")`,
	constructed: `observations.push(String(new ERRORS()))`,
	printed: `observations.push(out instanceof ERRORS ? out.toString() : "ok")`
}

const barrelProbes = Object.fromEntries(
	Object.entries(errorBarrels).flatMap(([style, [barrel, imported, errors]]) =>
		Object.entries(errorBarrelReads).map(([name, read]) => [
			`errors barrel ${style} ${name}`,
			{
				"ark.ts": `${barrel}\n`,
				"inner.ts": `export { ArkErrors as E } from "arktype"\n`,
				"main.ts": `import { type } from "arktype"
import ${imported} from "./ark.ts"

${failing.map((def, i) => `const T${i} = ${def}`).join("\n")}
${observing}
${failing
	.flatMap((_, i) =>
		inputs.map(
			input => `{
	const out = T${i}(${input} as any)
	try {
		${read.split("ERRORS").join(errors)}
	} catch (e) {
		observations.push({ threw: String((e as Error)?.message ?? e) })
	}
}`
		)
	)
	.join("\n")}
${printing}`
			}
		])
	)
)

// what validators.mdx documents a standalone validator's errors writing
// otherwise: an issue's JSON as its code, path, data, expected and message, a
// union's whose branches fail at what each is expecting without "must be", and
// assert's message as the summary rather than a bulleted list
export const documented = (observation: unknown): unknown =>
	Array.isArray(observation) ? observation.map(documented)
	: typeof observation === "string" ? documentedText(observation)
	: observation && typeof observation === "object" ?
		"code" in observation && "path" in observation ?
			Object.fromEntries(
				["code", "path", "data", "expected", "message"].map(k => {
					const v = (observation as Record<string, unknown>)[k]
					return [
						k,
						(
							k === "expected" &&
							observation.code === "union" &&
							typeof v === "string"
						) ?
							v.replace(/^must be /, "")
						:	documented(v)
					]
				})
			)
		:	Object.fromEntries(
				Object.entries(observation).map(([k, v]) => [k, documented(v)])
			)
	:	observation

const documentedText = (text: string): unknown => {
	if (text.startsWith("[{")) {
		try {
			return documented(JSON.parse(text))
		} catch {
			return text
		}
	}
	return text.startsWith("\n  • ") ?
			text.slice(5).split("\n  • ").join("\n")
		:	text
}

const ctxProbes = Object.fromEntries(
	Object.entries({ ...wholeKeeping, "ctx narrow": ctxNarrow }).map(
		([name, def]) => [
			`errors ${name}`,
			{
				"main.ts": `import { type } from "arktype"

const T = ${def}
${observing}
${inputs.map(input => `observe(() => { const out = T(${input} as any); return out instanceof type.errors ? [out.summary, out.issues.map(i => i.message)] : "ok" })`).join("\n")}
${printing}`
			}
		]
	)
)

export const probes: Record<string, Record<string, string>> = {
	...withPreds(identityProbes),
	...withPreds(handoffProbes),
	...errorProbes,
	...wholeProbes,
	...barrelProbes,
	...ctxProbes
}
