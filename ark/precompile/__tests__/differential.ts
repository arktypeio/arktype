import { fromHere } from "@ark/fs"
import {
	hasArkKind,
	schemaScope,
	ToJsonSchema,
	type BaseRoot,
	type BaseScope
} from "@ark/schema"
import { hasDomain, ParseError } from "@ark/util"
import {
	holeNameMarker,
	introspectionMembers,
	keyOf,
	keywordMetas,
	precompileStandalone,
	precompileStandaloneModules,
	type FoldedMember,
	type StandaloneExport,
	type ValidatorMembers
} from "arktype/internal/standalone.ts"
import "arktype/errors"
import * as arktypeRuntime from "arktype/internal/runtimeExports.ts"
import "arktype/mutatesInput"
import {
	bakedJsonSchemaOptionsMessage,
	writeUnbakedMessage
} from "arktype/runtime"
import { DynamicValue } from "@ark/precompile/internal/dynamic.ts"
import {
	keptIssuesOf,
	thrownIssuesOf,
	type KeptIssue
} from "@ark/precompile/internal/issues.ts"
import { build, type Plugin } from "esbuild"
import { writeFileSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { inspect } from "node:util"
import {
	detailsErrors,
	firstIssue,
	freezes,
	hasMember,
	lackedMembers,
	lacks,
	mutatesInput,
	testedOptions,
	traverse
} from "./contract.ts"
import { tempDir } from "./utils.ts"

// compares a Type with its precompiled validators on each call's outcome

// "merged" is a later build's modules, merging units by what the first read
type Layout = "inline" | "modules" | "merged"

export const layouts: Layout[] = ["inline", "modules", "merged"]

let out: string | undefined

const importFile = (path: string): Promise<any> =>
	import(pathToFileURL(path).href)

// a runtime export an artifact holds, paired with arktype's
const counterparts = new Map<unknown, unknown>()
const pairCopies = (copy: unknown, original: unknown): void => {
	if (typeof copy === "function" && typeof original === "function")
		counterparts.set(copy, original)
	else if (
		hasDomain(copy, "object") &&
		hasDomain(original, "object") &&
		Object.getPrototypeOf(copy) === Object.prototype
	) {
		for (const [k, v] of Object.entries(copy))
			pairCopies(v, (original as Record<string, unknown>)[k])
	}
}

const issuesPath = fromHere("..", "..", "schema", "shared", "issues.ts")

// issuesNone.ts for issues.ts, as @ark/schema/runtime/none bundles them
const undetailedIssues: Plugin = {
	name: "issuesNone",
	setup: pluginBuild =>
		pluginBuild.onResolve({ filter: /\/issues\.ts$/ }, args =>
			join(args.resolveDir, args.path) === issuesPath ?
				{ path: join(issuesPath, "..", "issuesNone.ts") }
			:	undefined
		)
}

// artifacts get their own runtime, sharing no state with arktype
export const outDir = async (): Promise<string> => {
	if (out) return out
	const dir = (out = tempDir("ark-differential-"))
	await build({
		stdin: {
			contents: `export * from "arktype/runtime"`,
			resolveDir: fromHere(),
			loader: "js"
		},
		bundle: true,
		format: "esm",
		platform: "neutral",
		conditions: ["ark-ts"],
		outfile: join(dir, "runtime.js"),
		logLevel: "error",
		plugins: detailsErrors ? [] : [undetailedIssues]
	})
	const runtime = await importFile(join(dir, "runtime.js"))
	artifactErrors = runtime.type.errors
	for (const [name, copy] of Object.entries(runtime))
		pairCopies(copy, (arktypeRuntime as Record<string, unknown>)[name])
	return dir
}

// the artifacts' runtime's ArkErrors, unlike those another copy wrote
let artifactErrors: Function | undefined

// a hole calling another runtime copy's validator returns foreign errors
const returnsForeignErrors = (
	validator: (data: unknown) => unknown,
	input: unknown
): boolean => {
	try {
		const out = validator(cloneInput(input))
		return hasArkKind(out, "errors") && !(out instanceof artifactErrors!)
	} catch {
		return false
	}
}

// what copying and writing in place both return, without the input after
const writtenLike = (call: ReturnType<typeof observeCall>) =>
	Object.fromEntries(
		Object.entries(call)
			.filter(([k]) => k !== "mutated")
			.map(([k, observed]) => {
				const { isInput, ...rest } = observed as Record<string, unknown>
				// an issue's object, which writing in place can change before it fails
				return [
					k,
					rest.issues ?
						{
							...rest,
							issues: (rest.issues as KeptIssue[]).map(issue => ({
								...issue,
								data: hasDomain(issue.data, "object") ? "object" : issue.data
							}))
						}
					:	rest
				]
			})
	)

// an unwritable or aliased input can't be written in place
const writesUnlikeCopy = (
	input: unknown,
	copied: ReturnType<typeof observeCall>,
	written: ReturnType<typeof observeCall>
): boolean => {
	const threw = (written.traverse as { threw?: string }).threw
	if (
		threw &&
		/^TypeError: Cannot (assign to read only|add|delete) property|object is not extensible/.test(
			threw
		)
	)
		return true
	return (
		holdsTwice(input) &&
		threw === undefined &&
		!("threw" in (copied.traverse as object)) &&
		"out" in (copied.traverse as object) ===
			"out" in (written.traverse as object)
	)
}

const holdsTwice = (value: unknown, seen = new Set<object>()): boolean => {
	if (typeof value !== "object" || value === null) return false
	if (seen.has(value)) return true
	seen.add(value)
	return Reflect.ownKeys(value).some(k => {
		const descriptor = Object.getOwnPropertyDescriptor(value, k)!
		return "value" in descriptor && holdsTwice(descriptor.value, seen)
	})
}

const link = (code: string) =>
	code
		.replace(/from "arktype\/runtime"/g, `from "./runtime.js"`)
		.replace(/"~arktype\/([^"]+)"/g, `"./$1.js"`)

// every artifact's modules share one directory, as a bundle shares them
const modulesBySpecifier: Record<string, string> = {}

let artifactCount = 0

const loadArtifact = async (
	exports: Record<string, StandaloneExport>,
	layout: Layout,
	members: ValidatorMembers
): Promise<any> => {
	const dir = await outDir()
	const opts = {
		members,
		errors: testedOptions.errors,
		freeze: testedOptions.freeze,
		lazy: testedOptions.lazy,
		checks: testedOptions.checks,
		mutatesInput: testedOptions.mutatesInput,
		optimize: testedOptions.optimize,
		configured: testedOptions.config === false ? (false as const) : undefined
	}
	let code: string
	if (layout === "inline") code = precompileStandalone(exports, opts).code
	else {
		let artifact = precompileStandaloneModules(exports, opts)
		if (layout === "merged") {
			artifact = precompileStandaloneModules(exports, {
				...opts,
				readers: artifact.reads
			})
		}
		for (const [specifier, module] of Object.entries(artifact.modules)) {
			const written = modulesBySpecifier[specifier]
			if (written === undefined) {
				modulesBySpecifier[specifier] = module
				writeFileSync(join(dir, `${specifier.slice(9)}.js`), link(module))
			} else if (written !== module) {
				throw new Error(
					`${specifier} names two modules:\n${written}\n${module}`
				)
			}
		}
		code = artifact.code
	}
	const path = join(dir, `artifact${artifactCount++}.js`)
	writeFileSync(path, link(code))
	return importFile(path)
}

// a Type holding functions or symbols precompiles to a factory passed them
const exportOf = (node: BaseRoot, holes: unknown[]): StandaloneExport => {
	if (!holes.length) return node as never
	const classes = new Set(
		[node, ...node.references].flatMap(n => (n.hasKind("proto") ? n.proto : []))
	)
	return {
		type: node as never,
		params: holes.map((hole, i) => ({
			kind:
				typeof hole === "symbol" ? "symbol"
				: classes.has(hole as never) ? "class"
				: "function",
			label: `hole${i}`,
			value: hole
		}))
	}
}

const placeholdersByHole = new Map<unknown, string>()

// a build names held functions by placeholders, which factories complete
const loadNamingHoles = async (
	node: BaseRoot,
	holes: unknown[],
	layout: Layout,
	members: ValidatorMembers
): Promise<any> => {
	const descriptors = holes.map(hole =>
		typeof hole === "function" ?
			Object.getOwnPropertyDescriptor(hole, "name")
		:	undefined
	)
	for (const hole of holes) {
		if (typeof hole !== "function") continue
		placeholdersByHole.set(
			hole,
			placeholdersByHole.get(hole) ??
				`${holeNameMarker}${placeholdersByHole.size.toString(36)}`
		)
		Object.defineProperty(hole, "name", {
			value: placeholdersByHole.get(hole),
			configurable: true
		})
	}
	try {
		return await loadArtifact({ T: exportOf(node, holes) }, layout, members)
	} finally {
		for (const [i, hole] of holes.entries()) {
			if (typeof hole !== "function") continue
			if (descriptors[i]) Object.defineProperty(hole, "name", descriptors[i])
			else delete (hole as { name?: string }).name
		}
	}
}

// copies data with its prototypes, descriptors, cycles and frozenness;
// sharing functions and builtins but arrays, Dates, RegExps, Maps and Sets
export const cloneInput = (
	value: unknown,
	seen = new Map<object, unknown>()
): unknown => {
	if (typeof value !== "object" || value === null) return value
	if (seen.has(value)) return seen.get(value)
	const tag = Object.prototype.toString.call(value)
	const copy =
		tag === "[object Array]" ? new Array((value as unknown[]).length)
		: tag === "[object Date]" ? new Date((value as Date).getTime())
		: tag === "[object RegExp]" ? new RegExp(value as RegExp)
		: tag === "[object Map]" ? new Map()
		: tag === "[object Set]" ? new Set()
		: tag === "[object Object]" && !(value instanceof Error) ? {}
		: undefined
	if (!copy) return value
	Object.setPrototypeOf(copy, Object.getPrototypeOf(value))
	seen.set(value, copy)
	if (copy instanceof Map) {
		for (const [k, v] of value as Map<unknown, unknown>)
			copy.set(cloneInput(k, seen), cloneInput(v, seen))
	}
	if (copy instanceof Set)
		for (const v of value as Set<unknown>) copy.add(cloneInput(v, seen))
	for (const k of Reflect.ownKeys(value)) {
		if (tag === "[object Array]" && k === "length") continue
		const descriptor = Object.getOwnPropertyDescriptor(value, k)!
		if ("value" in descriptor)
			descriptor.value = cloneInput(descriptor.value, seen)
		Object.defineProperty(copy, k, descriptor)
	}
	// a Proxy can list an index past its length, so it's passed as is
	if (
		tag === "[object Array]" &&
		(copy as unknown[]).length !== (value as unknown[]).length
	) {
		seen.set(value, value)
		return value
	}
	if (Object.isFrozen(value)) Object.freeze(copy)
	else if (Object.isSealed(value)) Object.seal(copy)
	else if (!Object.isExtensible(value)) Object.preventExtensions(copy)
	return copy
}

const { toString } = Object.prototype

// a pair being compared is assumed equal, so shared subgraphs walk once;
// `read` compares what enumerable keys read, as a copy drops accessors
const isEqual = (l: unknown, r: unknown, read = false): boolean => {
	const seen = new Map<object, Set<object>>()
	const equals = (l: any, r: any): boolean => {
		if (Object.is(l, r) || counterparts.get(r) === l) return true
		if (
			typeof l !== "object" ||
			typeof r !== "object" ||
			l === null ||
			r === null
		)
			return false
		let compared = seen.get(l)
		if (compared?.has(r)) return true
		if (!compared) seen.set(l, (compared = new Set()))
		compared.add(r)
		if (Object.getPrototypeOf(l) !== Object.getPrototypeOf(r)) return false
		const tag = toString.call(l)
		if (tag !== toString.call(r)) return false
		// an object can have a builtin's prototype without being one
		if (tag === "[object Date]") return Object.is(l.getTime(), r.getTime())
		if (tag === "[object RegExp]") return String(l) === String(r)
		if (tag === "[object Map]" || tag === "[object Set]") {
			const lEntries = [...l]
			const rEntries = [...r]
			if (
				lEntries.length !== rEntries.length ||
				!lEntries.every((entry, i) => equals(entry, rEntries[i]))
			)
				return false
		}
		if (tag === "[object Error]" && String(l) !== String(r)) return false
		if (read) {
			const keys = new Set<string>()
			for (const k in l) keys.add(k)
			for (const k in r) keys.add(k)
			return [...keys].every(k => equals(l[k], r[k]))
		}
		const lKeys = Reflect.ownKeys(l)
		const rKeys = Reflect.ownKeys(r)
		if (lKeys.length !== rKeys.length) return false
		for (let i = 0; i < lKeys.length; i++) {
			if (lKeys[i] !== rKeys[i]) return false
			const lDescriptor = Object.getOwnPropertyDescriptor(l, lKeys[i])!
			const rDescriptor = Object.getOwnPropertyDescriptor(r, rKeys[i])!
			if (
				"value" in lDescriptor !== "value" in rDescriptor ||
				lDescriptor.enumerable !== rDescriptor.enumerable ||
				("value" in lDescriptor &&
					!equals(lDescriptor.value, rDescriptor.value))
			)
				return false
		}
		return true
	}
	try {
		return equals(l, r)
	} catch (e) {
		if (!(e instanceof RangeError)) throw e
		// data nested past the stack is compared by its inspection to a fixed depth
		return inspect(l, { depth: 200 }) === inspect(r, { depth: 200 })
	}
}

const observe = (run: () => unknown, input: unknown): unknown => {
	try {
		const result: any = run()
		return hasArkKind(result, "errors") ?
				{ issues: keptIssuesOf(result, !firstIssue) }
			:	{ out: result, isInput: result === input }
	} catch (e) {
		const issues = thrownIssuesOf(e, !firstIssue)
		return issues ?
				{ threw: "TraversalError", issues }
			:	{
					threw: String(e),
					context: (e as { context?: unknown } | undefined)?.context
				}
	}
}

type Validator = Record<string, any> & ((data: unknown) => unknown)

// every member a build can bake, but ~standard's where the options drop it
const bakesEvery: ValidatorMembers = {
	...Object.fromEntries(
		introspectionMembers.map(member => [
			member,
			member !== "~standard.jsonSchema" || !lacks("~standard")
		])
	),
	...testedOptions.members
}

const printed: ValidatorMembers = {
	expression: true,
	description: true,
	...testedOptions.members
}

const observeAttributes = (t: Validator) => ({
	expression: t.expression,
	description: t.description,
	...(!lacks("methods") && { string: t.toString() }),
	...(!lacks("meta") && { meta: t.meta })
})

type Introspection = ReturnType<typeof observeIntrospection>

const observeIntrospection = (t: Validator) => ({
	json: observe(() => t.json, undefined),
	jsonSchema: observe(() => t.toJsonSchema(), undefined),
	// no options, and each target, which a validator writes only if baked
	jsonSchemaByOptions: [
		{},
		{ target: "draft-2020-12" },
		{ target: "draft-07" }
	].map(opts => observe(() => t.toJsonSchema(opts), undefined)),
	standardJsonSchema:
		lacks("~standard") ?
			[]
		:	(["input", "output"] as const).flatMap(io =>
				standardTargets.map(target =>
					observe(() => t["~standard"].jsonSchema[io]({ target }), undefined)
				)
			)
})

// a target arktype supports, the other and one it rejects
const standardTargets = ["draft-2020-12", "draft-07", "openapi-3.0"]

const unbakedSuffix = writeUnbakedMessage("")

const threwUnbaked = (observation: unknown): boolean =>
	(observation as { threw?: string }).threw?.endsWith(unbakedSuffix) ?? false

const threwOptions = (observation: unknown): boolean =>
	(observation as { threw?: string }).threw?.endsWith(
		bakedJsonSchemaOptionsMessage
	) ?? false

// a schema the build can't bake throws why where read, so it's not compared
const maskUnbaked = (
	arktype: Introspection,
	baked: Introspection
): Introspection => ({
	...arktype,
	jsonSchema:
		threwUnbaked(baked.jsonSchema) ? baked.jsonSchema : arktype.jsonSchema,
	jsonSchemaByOptions: arktype.jsonSchemaByOptions.map((observation, i) =>
		(
			threwUnbaked(baked.jsonSchemaByOptions[i]) ||
			// options naming nothing are always the configured schema
			(i > 0 && threwOptions(baked.jsonSchemaByOptions[i]))
		) ?
			baked.jsonSchemaByOptions[i]
		:	observation
	),
	standardJsonSchema: arktype.standardJsonSchema.map((observation, i) => {
		const first = i - (i % standardTargets.length)
		return (
				threwUnbaked(baked.standardJsonSchema[i]) ||
					// arktype reads in or out before checking the target, so any target throws
					(threwUnbaked(baked.standardJsonSchema[first]) &&
						isEqual(observation, arktype.standardJsonSchema[first]))
			) ?
				baked.standardJsonSchema[i]
			:	observation
	})
})

const foldedMembers = introspectionMembers.filter(
	(member): member is FoldedMember => member !== "~standard.jsonSchema"
)

const printsName = (data: unknown): boolean =>
	typeof data === "string" ?
		data.includes("$ark.") || data.includes(holeNameMarker)
	:	typeof data === "object" &&
		data !== null &&
		Object.values(data).some(printsName)

const readFolded = (node: BaseRoot, member: FoldedMember): unknown =>
	member === "toJSON" || member === "toJsonSchema" ?
		node[member]()
	:	node[member]

// what sites reading introspection fold to, unless it prints a hole
const foldedIntrospectionOf = (
	node: BaseRoot
): Record<string, StandaloneExport> => {
	const exports: Record<string, StandaloneExport> = {}
	for (const member of foldedMembers) {
		let data: unknown
		let thrown: unknown
		try {
			data = readFolded(node, member)
		} catch (e) {
			if (!(e instanceof ToJsonSchema.Error)) continue
			thrown = e
		}
		if (!printsName(thrown ? String(thrown) : data))
			exports[member] = { member, type: node, data, params: [], thrown }
	}
	return exports
}

// what each folded site returns
const observeFolded = (
	read: (member: FoldedMember) => unknown,
	members: string[]
) =>
	members.map(member => observe(() => read(member as FoldedMember), undefined))

const observeCall = (t: Validator, input: unknown) => {
	const traversed = cloneInput(input)
	const traversal = observe(() => traverse(t, traversed), traversed)
	return {
		traverse: traversal,
		...(((detailsErrors && !firstIssue) || !fails(traversal)) && {
			mutated: traversed
		}),
		allows: observe(() => t.allows(cloneInput(input)), undefined),
		...(!lacks("assert") && {
			assert: observe(() => t.assert(cloneInput(input)), undefined)
		}),
		...(!lacks("~standard") && {
			standard: observe(
				() => t["~standard"].validate(cloneInput(input)),
				undefined
			)
		})
	}
}

const hasIssues = (observation: unknown): boolean =>
	hasDomain(observation, "object") && "issues" in observation

// whether a validation returned its errors, unless a callback threw
const fails = (observation: unknown): boolean =>
	hasIssues(observation) && !("threw" in (observation as object))

// a scope validating as the build's errors option says
const erroringScope =
	testedOptions.errors && testedOptions.errors !== "all" ?
		schemaScope({}, { errors: testedOptions.errors })
	:	undefined

// scopes writing in place as the build does, failing as copying does
const inPlaceScopesByOnFail = new Map<unknown, BaseScope>()

const inPlaceScopeOf = (node: BaseRoot): BaseScope => {
	const { onFail } = (erroringScope ?? node.$).resolvedConfig
	let $ = inPlaceScopesByOnFail.get(onFail)
	if (!$) {
		$ = schemaScope(
			{},
			{ errors: testedOptions.errors ?? "all", mutatesInput, onFail }
		)
		inPlaceScopesByOnFail.set(onFail, $)
	}
	return $
}

// an alias stays in the scope resolving it, so its resolution is bound, and
// one writing in place is compiled as its Scope would compile it
const validatedOf = (node: BaseRoot, inPlace = false): BaseRoot => {
	const $ = inPlace ? inPlaceScopeOf(node) : erroringScope
	if (!$) return node
	let resolved = node
	while (resolved.hasKind("alias")) resolved = resolved.resolution
	const bound = $.bindReference(resolved)
	return inPlace ? $.finalize(bound) : bound
}

// a hole returning arktype's errors or nodes, foreign to the runtime
const holdsArkValue = (value: unknown, seen = new Set<unknown>()): boolean => {
	if (
		(typeof value !== "object" && typeof value !== "function") ||
		value === null ||
		seen.has(value)
	)
		return false
	seen.add(value)
	if ((value as any)[" arkKind"]) return true
	if (typeof value === "function") return false
	return Reflect.ownKeys(value).some(k => {
		const descriptor = Object.getOwnPropertyDescriptor(value, k)!
		return "value" in descriptor && holdsArkValue(descriptor.value, seen)
	})
}

interface Observations {
	attributes: ReturnType<typeof observeAttributes>
	// undefined where a hole arktype calls writing it makes two reads disagree
	introspection: ReturnType<typeof observeIntrospection> | undefined
	// undefined where a hole holding state makes two calls disagree
	calls: (ReturnType<typeof observeCall> | undefined)[]
	// writing in place as the build does, compared with a build that does
	inPlaceCalls?: (ReturnType<typeof observeCall> | undefined)[]
}

// what arktype observes, before a build renames the functions a Type holds
const observeStably = <t>(observeOnce: () => t): t | undefined => {
	const observed = observeOnce()
	return isEqual(observed, observeOnce()) ? observed : undefined
}

export const observeArktype = (
	node: BaseRoot,
	inputs: unknown[]
): Observations => ({
	attributes: {
		...observeAttributes(node as never),
		// a validator bakes a Type's meta, but not a keyword's
		...(!lacks("meta") && {
			meta: keywordMetas().has(node.meta) ? {} : node.meta
		})
	},
	introspection: observeStably(() => observeIntrospection(node as never)),
	calls: observeCalls(validatedOf(node), inputs),
	...(mutatesInput && {
		inPlaceCalls: observeCalls(validatedOf(node, true), inputs)
	})
})

const observeCalls = (node: BaseRoot, inputs: unknown[]) =>
	inputs.map(input => {
		const call = observeCall(node as never, input)
		if (!isEqual(call, observeCall(node as never, input))) return
		return call
	})

interface Comparison {
	refusal?: string
	harnessLimited: number
	// false where a bake was refused or arktype disagreed with itself
	isIntrospected: boolean
	// whether a schema it bakes throws why the build can't write it
	isUnbaked: boolean
	// false where its data prints a function's name
	isFolded: boolean
	disagreements: string[]
}

export const compare = async (
	node: BaseRoot,
	inputs: unknown[],
	arktype: Observations
): Promise<Comparison> => {
	const result: Comparison = {
		harnessLimited: 0,
		isIntrospected: false,
		isUnbaked: false,
		isFolded: false,
		disagreements: []
	}
	// as the build refuses a Type configured with other errors or mutatesInput
	const configured = node.$.config
	if (
		configured.errors &&
		configured.errors !== (testedOptions.errors ?? "all")
	)
		return { ...result, refusal: "configured errors" }
	if (
		configured.mutatesInput !== undefined &&
		configured.mutatesInput !== mutatesInput
	)
		return { ...result, refusal: "configured mutatesInput" }
	const holes = keyOf(node)[1]
	// writing in place returns what copying does, unless the input breaks it
	for (const [i, input] of inputs.entries()) {
		const copied = arktype.calls[i]
		const written = arktype.inPlaceCalls?.[i]
		if (
			!copied ||
			!written ||
			isEqual(writtenLike(copied), writtenLike(written), true)
		)
			continue
		if (
			writesUnlikeCopy(input, copied, written) ||
			(mutatesInput === "always" && holdsTwice(input))
		)
			result.harnessLimited++
		else {
			result.disagreements.push(
				inspect(
					{
						expression: node.expression,
						observation: "in place",
						input,
						copied,
						written
					},
					{ depth: 5, breakLength: 120 }
				).slice(0, 4000)
			)
		}
	}
	for (const layout of layouts) {
		const disagree = (observation: string, details: object) =>
			result.disagreements.push(
				inspect(
					{ expression: node.expression, layout, observation, ...details },
					{ depth: 5, breakLength: 120 }
				).slice(0, 4000)
			)
		await compareFolded(node, layout, result, disagree)
		let artifact: any
		// introspection the build refuses to bake leaves the attributes to compare
		let isBaked = true
		try {
			artifact = await loadNamingHoles(node, holes, layout, bakesEvery).catch(
				e => {
					if (!(e instanceof ParseError)) throw e
					isBaked = false
					return loadNamingHoles(node, holes, layout, printed)
				}
			)
		} catch (e) {
			const refusal =
				e instanceof ParseError ? e.message.split("\n")[0]
				: e instanceof DynamicValue ? "a stand-in a build created it with"
				: undefined
			if (refusal === undefined) disagree("build", { threw: String(e) })
			else if (layout === layouts[0]) result.refusal = refusal
			else if (result.refusal === undefined) disagree("refusal", { refusal })
			continue
		}
		if (result.refusal !== undefined) {
			disagree("refusal", { [layouts[0]]: result.refusal })
			continue
		}
		let validator: Validator
		try {
			validator = artifact.T(...holes)
		} catch (e) {
			disagree("creation", { threw: String(e) })
			continue
		}
		const unlacked = lackedMembers.filter(member =>
			hasMember(validator, member)
		)
		if (unlacked.length) disagree("members", { unlacked })
		if (Object.isFrozen(validator) !== freezes)
			disagree("frozen", { frozen: Object.isFrozen(validator) })
		const attributes = observeAttributes(validator)
		if (!isEqual(arktype.attributes, attributes)) {
			disagree("attributes", {
				arktype: arktype.attributes,
				precompiled: attributes
			})
		}
		if (isBaked && arktype.introspection) {
			result.isIntrospected = true
			const baked = observeIntrospection(validator)
			result.isUnbaked ||=
				threwUnbaked(baked.jsonSchema) ||
				baked.standardJsonSchema.some(threwUnbaked)
			if (!isEqual(maskUnbaked(arktype.introspection, baked), baked)) {
				disagree("introspection", {
					arktype: arktype.introspection,
					precompiled: baked
				})
			}
		}
		for (const [i, input] of inputs.entries()) {
			const expected = (arktype.inPlaceCalls ?? arktype.calls)[i]
			const actual = observeCall(validator, input)
			if (expected && isEqual(expected, actual)) continue
			if (
				!expected ||
				holdsArkValue(actual) ||
				returnsForeignErrors(validator, input)
			) {
				if (layout === layouts[0]) result.harnessLimited++
			} else disagree("call", { input, arktype: expected, precompiled: actual })
		}
	}
	return result
}

const compareFolded = async (
	node: BaseRoot,
	layout: Layout,
	result: Comparison,
	disagree: (observation: string, details: object) => void
) => {
	const folded = foldedIntrospectionOf(node)
	if (!Object.keys(folded).length) return
	let artifact: any
	try {
		artifact = await loadArtifact(folded, layout, {}).catch(e => {
			// e.g. a schema calling a default's thunk, which arktype calls each time
			if (!(e instanceof ParseError) || !folded.toJsonSchema) throw e
			delete folded.toJsonSchema
			return loadArtifact(folded, layout, {})
		})
	} catch (e) {
		if (!(e instanceof ParseError))
			disagree("folded build", { threw: String(e) })
		return
	}
	const members = Object.keys(folded)
	const expected = observeStably(() =>
		observeFolded(member => readFolded(node, member), members)
	)
	if (!members.length || !expected) return
	result.isFolded = true
	const actual = observeFolded(member => artifact[member](), members)
	if (!isEqual(expected, actual))
		disagree("folded", { members, arktype: expected, precompiled: actual })
}
