import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { $ark } from "@ark/schema"
import { scope, type } from "arktype"
import { de } from "arktype/locales/de"
import {
	precompileStandalone,
	writeUnprecompilableMessage
} from "arktype/internal/standalone.ts"
import {
	abiVersion,
	writeAbiVersionMismatchMessage,
	writeUnavailableMemberMessage
} from "arktype/runtime"
import { buildSync } from "esbuild"

// a bundle holds only what an artifact imports, so validating with it proves no node is needed
const bundle = (types: Record<string, type.Any>) => {
	const result = buildSync({
		stdin: {
			contents: precompileStandalone(types),
			resolveDir: fromHere(),
			loader: "js"
		},
		absWorkingDir: fromHere("..", ".."),
		bundle: true,
		format: "esm",
		platform: "neutral",
		conditions: ["ark-ts"],
		write: false,
		metafile: true,
		logLevel: "error"
	})
	return {
		js: result.outputFiles[0].text,
		modules: Object.keys(result.metafile.inputs)
	}
}

const load = async (
	types: Record<string, type.Any>
): Promise<Record<string, any>> =>
	import(
		`data:text/javascript;base64,${Buffer.from(bundle(types).js).toString("base64")}`
	)

// an artifact's errors come from its bundled runtime, so they aren't instances of type.errors
const isErrors = (result: unknown): result is type.errors =>
	(result as type.errors | undefined)?.[" arkKind"] === "errors"

const observe = (result: unknown, input: unknown) =>
	isErrors(result) ?
		{
			summary: result.summary,
			errors: result.issues.map(e => ({
				code: e.code,
				path: [...e.path],
				data: e.data,
				expected: e.expected,
				actual: e.actual,
				problem: e.problem,
				message: e.message
			}))
		}
	:	{ out: result, isInput: result === input }

class Point {
	x = 1
	y = 2
}

contextualize(() => {
	it("validates as the types it was precompiled from", async () => {
		const $ = scope({
			tree: { value: "number", "children?": "tree[]" },
			user: {
				name: "string > 0",
				age: "number.integer >= 0",
				"email?": "string.email",
				tags: "string[] <= 3"
			}
		}).export()
		const { a0 } = scope({
			a0: "Record<string, a1 | a2>",
			a1: { p0: "string = 'd'", "p1?": "string" },
			a2: { kind: "'a2'", "p0?": "a0", p1: "a2 | null" }
		}).export()
		// content-equal cycles the JIT tracks apart
		const { x }: Record<string, type.Any> = scope({
			a0: [["Record<string, null>", "...", "a0[]"], "[]"],
			c0: [["Record<string, null>", "...", "c0[]"], "[]"],
			c1: ["c0", "...", "c1[]"],
			x: "a0 & c1"
		} as never).export() as never
		const types = {
			user: $.user,
			cycles: x,
			tree: $.tree,
			deep: a0.onDeepUndeclaredKey("delete"),
			parsed: type({ count: "string.numeric.parse", "+": "delete" }),
			json: type("string.json.parse"),
			shapes: type({ kind: "'circle'", r: "number > 0" }).or({
				kind: "'square'",
				side: "number"
			}),
			mixed: type("string | number[] | Date >= d'2000-01-01T00:00:00Z'"),
			tuple: type(["string", "number = 3", "boolean = true"]),
			piped: type("string.trim").to("string > 1"),
			dates: type({ at: "string.date.iso.parse" }).array(),
			typeError: type.instanceOf(TypeError)
		}
		const validators = await load(types)
		const cyclic: any = { value: 1, children: [] }
		cyclic.children.push(cyclic)
		const cyclicArray: unknown[] = []
		cyclicArray.push(cyclicArray, cyclicArray)
		const inputs = [
			{ name: "a", age: 1, tags: [] },
			{ name: "", age: -1.5, email: "x", tags: ["a", "b", "c", "d"] },
			{ value: 1, children: [{ value: 2 }, { value: "3" }] },
			cyclic,
			cyclicArray,
			{ count: "5", extra: true },
			new Point(),
			'{"a": [1]}',
			"{",
			"",
			{ kind: "circle", r: 0 },
			{ kind: "triangle" },
			[1, "2"],
			new Date(0),
			["a"],
			["a", "b"],
			"  x ",
			" y ",
			[{ at: "2020-01-01" }, { at: "x" }],
			new TypeError("x"),
			{ k: { p1: "s", z: 1 } },
			{ k: { kind: "a2", p1: null, p0: { j: { p1: "x", z: 1 } }, z: 1 } },
			null
		]
		for (const [name, t] of Object.entries(types)) {
			for (const input of inputs) {
				attest(observe(validators[name](input), input)).equals(
					observe(t(input), input)
				)
				attest(validators[name].allows(input)).equals(t.allows(input))
			}
		}
	})

	it("bakes introspection", async () => {
		const T = type({ name: "string", age: "number" }).describe("a person")
		const { T: validator } = await load({ T })
		attest(validator.expression).equals(T.expression)
		attest(validator.description).equals("a person")
		attest(validator.meta).equals({ description: "a person" })
		attest(String(validator)).equals("Type<{ age: number, name: string }>")
		attest(validator.from({ name: "n", age: 1 })).equals({ name: "n", age: 1 })
		attest(() => validator.assert({})).throws.snap(`TraversalError: 
  • age must be a number (was missing)
  • name must be a string (was missing)`)
		attest(validator["~standard"].validate({ name: "n", age: 1 })).equals({
			value: { name: "n", age: 1 }
		})
		attest("jsonSchema" in validator["~standard"]).equals(false)
	})

	it("throws on members that need arktype", async () => {
		const { T } = await load({ T: type("string") })
		attest(() => T.and("number")).throws(writeUnavailableMemberMessage("and"))
		attest(() => T.in).throws(writeUnavailableMemberMessage("in"))
		attest(() => T.toJsonSchema()).throws(
			writeUnavailableMemberMessage("toJsonSchema")
		)
	})

	it("rejects what it can't precompile", () => {
		const isEven = (n: number) => n % 2 === 0
		attest(() =>
			precompileStandalone({ T: type("number").narrow(isEven) })
		).throws(writeUnprecompilableMessage("Function(isEven)"))
	})

	it("rejects a configured locale", () => {
		const { locale } = $ark.config
		Object.assign($ark.config, { locale: de })
		try {
			attest(() => precompileStandalone({ T: type("string") })).throws(
				writeUnprecompilableMessage("a configured locale")
			)
		} finally {
			Object.assign($ark.config, { locale })
		}
	})

	it("checks the runtime's version", async () => {
		const { js } = bundle({ T: type("string") })
		const mismatched = js.replace(
			`assertAbiVersion(${abiVersion})`,
			`assertAbiVersion(${abiVersion + 1})`
		)
		const error = await import(
			`data:text/javascript;base64,${Buffer.from(mismatched).toString("base64")}`
		).catch((e: Error) => e)
		attest(error.message).equals(
			writeAbiVersionMismatchMessage(abiVersion + 1, abiVersion)
		)
	})

	it("bundles without node, scope or parse code", () => {
		const { modules } = bundle({
			T: type({ a: "string.numeric.parse", b: "(number | Date)[]" }).or(
				"string.json.parse"
			)
		})
		const runtimeModules = new Set([
			"<stdin>",
			"schema/runtime.ts",
			"schema/shared/errors.ts",
			"schema/shared/locale.ts",
			"schema/shared/registry.ts",
			"schema/shared/render.ts",
			"schema/shared/transform.ts",
			"schema/shared/traversal.ts",
			"schema/shared/utils.ts",
			"schema/structure/shared.ts",
			"type/keywords/functions.ts",
			"type/runtime.ts"
		])
		attest(
			modules.filter(
				path => !path.startsWith("util/") && !runtimeModules.has(path)
			)
		).equals([])
	})
})
