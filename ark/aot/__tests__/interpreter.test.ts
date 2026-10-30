import { attest, contextualize } from "@ark/attest"
import { ModuleGraph } from "@ark/aot/internal/graph.ts"
import {
	createSiteState,
	findDynamic,
	Interpreter
} from "@ark/aot/internal/interpreter.ts"
import fc from "fast-check"
import { runInNewContext } from "node:vm"
import type { VariableDeclaration } from "oxc-parser"

const interpret = (expression: string): { value: unknown } | undefined => {
	const graph = new ModuleGraph({
		resolve: () => undefined,
		readFile: () => undefined
	})
	const module = graph.add("/main.ts", `const value = ${expression}`)
	const declaration = module.program.body[0] as VariableDeclaration
	const state = new Interpreter(graph).evaluateSite(
		createSiteState(declaration.declarations[0].init!, module)
	)
	return state.error === undefined && !findDynamic(state.value) ?
			{ value: state.value }
		:	undefined
}

// values from either realm, with key order and each number's text
const print = (value: unknown): string => {
	if (typeof value === "number")
		return Object.is(value, -0) ? "-0" : String(value)
	if (typeof value === "string") return JSON.stringify(value)
	if (typeof value === "bigint") return `${value}n`
	if (typeof value === "symbol") return String(value)
	if (typeof value === "function") return "function"
	if (typeof value !== "object" || value === null) return String(value)
	const tag = Object.prototype.toString.call(value)
	if (tag === "[object RegExp]") return String(value)
	if (tag === "[object Date]") return `Date(${(value as Date).getTime()})`
	if (Array.isArray(value))
		return `[${Array.from(value, (_, i) => (i in value ? print(value[i]) : "<empty>")).join(", ")}]`

	return `{${Reflect.ownKeys(value)
		.map(k => `${String(k)}: ${print(Reflect.get(value, k))}`)
		.join(", ")}}`
}

const keys = ["a", "b", "length", "0", "1", "10", "-1", "1.5"]

const literal = fc.oneof(
	fc.integer({ min: -100, max: 100 }).map(String),
	fc.double().map(n => (Object.is(n, -0) ? "-0" : String(n))),
	fc.constantFrom("0.1", "1e21", "1e-7", "2 ** 53", "0x1f", "1_000", "10n"),
	fc.string({ maxLength: 4 }).map(s => JSON.stringify(s)),
	fc.constantFrom("true", "false", "null", "undefined", "NaN", "Infinity")
)

const { expression } = fc.letrec<{ expression: string }>(tie => ({
	expression: fc.oneof(
		{ depthSize: "small", withCrossShrink: true },
		literal,
		fc
			.tuple(
				fc.constantFrom("-", "+", "!", "~", "typeof ", "void "),
				tie("expression")
			)
			.map(([op, operand]) => `${op}(${operand})`),
		fc
			.tuple(
				tie("expression"),
				fc.constantFrom(
					"+",
					"-",
					"*",
					"/",
					"%",
					"**",
					"==",
					"!=",
					"===",
					"!==",
					"<",
					"<=",
					">",
					">=",
					"&",
					"|",
					"^",
					"<<",
					">>",
					">>>",
					"&&",
					"||",
					"??",
					"in"
				),
				tie("expression")
			)
			.map(([l, op, r]) => `(${l}) ${op} (${r})`),
		fc
			.tuple(tie("expression"), tie("expression"), tie("expression"))
			.map(([test, l, r]) => `(${test}) ? (${l}) : (${r})`),
		fc
			.array(tie("expression"), { maxLength: 3 })
			.map(items => `[${items.join(", ")}]`),
		fc
			.array(fc.tuple(fc.constantFrom(...keys), tie("expression")), {
				maxLength: 3
			})
			.map(
				entries =>
					`({ ${entries.map(([k, v]) => `${JSON.stringify(k)}: ${v}`).join(", ")} })`
			),
		fc
			.tuple(tie("expression"), tie("expression"))
			.map(([l, r]) => `\`a\${${l}}b\${${r}}\``),
		fc
			.tuple(tie("expression"), tie("expression"))
			.map(([l, r]) => `[...(${l}), ...(${r})]`),
		fc
			.tuple(tie("expression"), tie("expression"))
			.map(([l, r]) => `({ ...(${l}), ...(${r}) })`),
		fc
			.tuple(tie("expression"), fc.constantFrom(...keys))
			.map(([o, k]) => `(${o})[${JSON.stringify(k)}]`),
		fc
			.tuple(
				fc.constantFrom(
					"Math.max",
					"Math.min",
					"Math.floor",
					"Math.abs",
					"String",
					"Number",
					"Boolean",
					"JSON.stringify",
					"Object.keys",
					"Object.entries",
					"parseInt"
				),
				fc.array(tie("expression"), { maxLength: 2 })
			)
			.map(([fn, args]) => `${fn}(${args.join(", ")})`),
		fc
			.tuple(
				tie("expression"),
				fc.constantFrom(
					"toString()",
					"toString(2)",
					"slice(1)",
					"padStart(3, '-')",
					"toUpperCase()",
					"join('|')",
					"concat([1])",
					"includes(1)",
					"indexOf('a')",
					"at(-1)"
				)
			)
			.map(([receiver, method]) => `(${receiver}).${method}`)
	)
}))

contextualize(() => {
	it("computes what the engine computes", () => {
		let accepted = 0
		fc.assert(
			fc.property(expression, source => {
				const result = interpret(source)
				let expected: string
				try {
					expected = print(runInNewContext(`(${source})`))
				} catch {
					attest(result).equals(undefined)
					return
				}
				if (!result) return
				accepted++
				attest(print(result.value)).equals(expected)
			}),
			{ numRuns: 500 }
		)
		attest(accepted).satisfies("number > 100")
	})

	it("rejects overwriting what the build does not know", () => {
		attest(interpret("({ a: ({}).f(), a: 1 })")).equals(undefined)
		attest(interpret("({ a: [({}).f()], a: 1 })")).equals(undefined)
		attest(interpret("({ ...[({}).f()], ...[1] })")).equals(undefined)
		attest(interpret("({ a: [({}).f()], ...{ a: 1 } })")).equals(undefined)
		attest(interpret("({ ...[0], ...[1] })")).equals({ value: { 0: 1 } })
	})
})
