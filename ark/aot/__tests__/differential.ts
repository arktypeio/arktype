import { fromHere } from "@ark/fs"
import {
	ArkErrors,
	describeBranches,
	hasArkKind,
	schemaScope,
	suppliedText,
	type ArkError,
	ToJsonSchema,
	type BaseRoot,
	type BaseScope
} from "@ark/schema"
import { writeMessage } from "@ark/schema/internal"
import { messageOf, problemOf, type ArkIssue } from "@ark/schema/runtime"
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
import { DynamicValue } from "@ark/aot/internal/dynamic.ts"
import { flattenBundle } from "@ark/aot/internal/flat.ts"
import {
	keptIssuesOf,
	keptOf,
	pathKeyOf,
	thrownErrorsOf,
	type KeptIssue
} from "@ark/aot/internal/issues.ts"
import { build } from "esbuild"
import { writeFileSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { inspect, types } from "node:util"
import {
	jsonInput,
	detailsErrors,
	firstIssue,
	freezes,
	leanErrors,
	hasMember,
	lackedMembers,
	lacks,
	mutatesInput,
	testedOptions,
	traverse
} from "./contract.ts"
import { issuesFrom, tempDir } from "./utils.ts"

// compared with errors "all", as errors "first" reports one of arktype's issues
const comparesExpecteds = detailsErrors && !firstIssue

// compares a Type with its precompiled validators on each call's outcome

// "flat" is the modules with their units declared in one function, as a
// one-chunk production bundle declares them, which size-optimized units never
// are; "shaped" is a size build's modules with common intersections written as
// shapes, as a program with enough of them is
type Layout = "inline" | "modules" | "flat" | "shaped"

export const layouts: Layout[] =
	testedOptions.optimize === "size" ?
		["inline", "modules", "shaped"]
	:	["inline", "modules", "flat"]

// artifacts whose units were declared in one function
export let flattened = 0

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
		plugins:
			!detailsErrors ?
				[issuesFrom(leanErrors ? "issuesNoneLean.ts" : "issuesNone.ts")]
			: leanErrors ? [issuesFrom("issuesLean.ts")]
			: []
	})
	const runtime = await importFile(join(dir, "runtime.js"))
	artifactErrors = runtime.type.errors
	for (const [name, copy] of Object.entries(runtime))
		pairCopies(copy, (arktypeRuntime as Record<string, unknown>)[name])
	return dir
}

// the artifacts' runtime's ArkErrors, unlike those another copy wrote
let artifactErrors: Function | undefined

// a validator's errors have no arkKind, so the artifacts' are known by their
// class
const isErrors = (value: unknown): boolean =>
	hasArkKind(value, "errors") ||
	(!!artifactErrors && value instanceof artifactErrors)

// a hole calling another runtime copy's validator returns foreign errors
const returnsForeignErrors = (
	validator: (data: unknown) => unknown,
	input: unknown
): boolean => {
	try {
		const out = validator(cloneInput(input))
		return (
			(hasArkKind(out, "errors") || out instanceof arktypeRuntime.ArkErrors) &&
			!(out instanceof artifactErrors!)
		)
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
				const issues = reportedOf(rest) as KeptIssue[] | undefined
				// an issue's object, which writing in place can change before it fails
				return [
					k,
					issues ?
						withReported(
							rest,
							issues.map(issue => ({
								...issue,
								data: hasDomain(issue.data, "object") ? "object" : issue.data
							}))
						)
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

// a plain object a count can see fewer of its keys in than a scan, or a Proxy
const holdsUncounted = (value: unknown, seen = new Set<object>()): boolean => {
	if (typeof value !== "object" || value === null || seen.has(value))
		return false
	seen.add(value)
	if (types.isProxy(value)) return true
	if (
		Object.getPrototypeOf(value) === Object.prototype &&
		Object.getOwnPropertyNames(value).some(
			k => !Object.prototype.propertyIsEnumerable.call(value, k)
		)
	)
		return true
	return Reflect.ownKeys(value).some(k => {
		const descriptor = Object.getOwnPropertyDescriptor(value, k)!
		return "value" in descriptor && holdsUncounted(descriptor.value, seen)
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
		checks: testedOptions.creationChecks,
		mutatesInput: testedOptions.mutatesInput,
		optimize: testedOptions.optimize,
		jsonInput: testedOptions.jsonInput,
		configured: testedOptions.config === false ? (false as const) : undefined,
		shapes: layout === "shaped"
	}
	let code: string
	if (layout === "inline") code = precompileStandalone(exports, opts).code
	else {
		const artifact = precompileStandaloneModules(exports, opts)
		const flat =
			layout === "flat" ?
				flattenBundle(
					{ "artifact.js": artifact.code },
					artifact.modules,
					new Map([["artifact.js", true]]),
					false
				)
			:	undefined
		if (flat) {
			flattened++
			artifact.code = flat.sites["artifact.js"].code
			artifact.modules = flat.modules
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
		[node, ...node.references].flatMap(n => (n.is("proto") ? n.proto : []))
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

// a copied error, e.g. a union branch's, has no source to read
const suppliedTextOf = (
	error: ArkError,
	k: "expected" | "message" | "problem"
) => {
	try {
		return suppliedText(error, k)
	} catch {
		return undefined
	}
}

// text a meta or a callback writes, which a validator writes as arktype does
const textsOf = (errors: ArkErrors, grouped = true) => {
	const isArktype = errors instanceof ArkErrors
	// reading issues writes every error's text
	const written: readonly ArkIssue[] = errors.issues
	const added = grouped ? written : errors._
	return added
		.flatMap((issue): readonly ArkIssue[] =>
			issue.code === "intersection" ?
				(issue as ArkError<"intersection">).errors
			:	[issue]
		)
		.flatMap(issue => {
			const text: { at: string; message?: string; problem?: string } = {
				at: `${pathKeyOf(issue.path)}\0${issue.code}`
			}
			if (isArktype) {
				const error = issue as ArkError
				const meta: Record<string, unknown> = error.meta ?? {}
				// a validator's issue merged into arktype's errors keeps its problem
				const isMerged =
					meta.problem === meta.expected ||
					meta.problem ===
						problemOf({
							code: error.code,
							path: error.path,
							data: error.data,
							expected: meta.expected as never
						})
				const isMessaged =
					(meta.message !== undefined && meta.message !== writeMessage) ||
					suppliedTextOf(error, "message") !== undefined
				if (
					(meta.problem !== undefined && !isMerged) ||
					suppliedTextOf(error, "problem") !== undefined ||
					(!isMessaged &&
						meta.problem === undefined &&
						(typeof meta.actual === "function" ||
							(typeof meta.actual === "string" && meta.actual !== "")))
				)
					text.problem = error.problem
				if (isMessaged) text.message = error.message
			} else {
				if (issue.problem !== undefined) text.problem = issue.problem
				if (issue.message !== messageOf({ ...issue, message: undefined }))
					text.message = issue.message!
			}
			return Object.keys(text).length > 1 ? [text] : []
		})
		.sort((l, r) => (l.at < r.at ? -1 : 1))
}

// a union whose branches each fail at its path by their basis is described
// by those bases, as a validator's union issue is
const basisCodes = new Set<string>(["domain", "proto"])

// what each issue expects, at its path and code, where a validator's issue is
// written alike: not a missing key, an issue a callback raised without an
// expected, nor a union described by its branches' errors, as a validator's
// issue holds neither the callback nor the errors
const expectedsOf = (errors: ArkErrors) =>
	keptOf(errors)
		.map(issue => ({
			at: `${pathKeyOf(issue.path)}\0${issue.code}`,
			expected:
				!(errors instanceof ArkErrors) ? (issue.expected ?? null)
				: issue.code === "required" || raisesUnexpected(issue as ArkError) ?
					null
				: issue.code === "union" ? unionExpectedOf(issue as ArkError<"union">)
				: issue.expected
		}))
		.sort((l, r) => (l.at < r.at ? -1 : 1))

// a check's error holds its description, which a raised one doesn't unless
// pipe.try raised it, describing it by its morph
const raisesUnexpected = (error: ArkError) =>
	error.code !== "union" &&
	error.description === undefined &&
	(error as ArkError<"predicate">).morph === undefined &&
	suppliedTextOf(error, "expected") === undefined

const unionExpectedOf = (error: ArkError<"union">): string | null => {
	const meta: Record<string, unknown> = error.meta ?? {}
	if (
		(meta.description !== undefined && meta.keyword === undefined) ||
		meta.expected !== undefined
	)
		return error.expected
	if (
		!error.errors.length ||
		!error.errors.every(
			e => e.propString === error.propString && basisCodes.has(e.code)
		)
	)
		return null
	return describeBranches([...new Set(error.errors.map(e => e.expected))])
}

// a validator's expected where arktype's is written from what it doesn't hold
const maskExpecteds = (arktype: unknown, precompiled: unknown): unknown => {
	if (!hasDomain(arktype, "object") || !hasDomain(precompiled, "object"))
		return precompiled
	const expecteds = (arktype as { expecteds?: { expected: unknown }[] })
		.expecteds
	const compared = (precompiled as { expecteds?: { expected: unknown }[] })
		.expecteds
	if (!expecteds || !compared || expecteds.length !== compared.length)
		return precompiled
	return {
		...precompiled,
		expecteds: compared.map((entry, i) =>
			expecteds[i].expected === null ? { ...entry, expected: null } : entry
		)
	}
}

const observe = (run: () => unknown, input: unknown): unknown => {
	try {
		const result: any = run()
		return isErrors(result) ?
				{
					issues: keptIssuesOf(result, !firstIssue),
					...(detailsErrors && { texts: textsOf(result, !firstIssue) }),
					...(comparesExpecteds && { expecteds: expectedsOf(result) })
				}
			:	{ out: result, isInput: result === input }
	} catch (e) {
		const cause = (e as { cause?: unknown } | undefined)?.cause
		// an errors "none" assertion's cause has no arkKind where errors are written for size
		const errors =
			thrownErrorsOf(e) ?? (isErrors(cause) ? (cause as ArkErrors) : undefined)
		const issues = errors && keptIssuesOf(errors, !firstIssue)
		return issues ?
				{
					threw: "TraversalError",
					issues,
					...(detailsErrors && { texts: textsOf(errors!, !firstIssue) }),
					...(comparesExpecteds && { expecteds: expectedsOf(errors!) })
				}
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

const keepBase = (ctx: { base: unknown }) => ctx.base as never

const observeIntrospection = (t: Validator) => ({
	json: observe(() => t.json, undefined),
	jsonSchema: observe(() => t.toJsonSchema(), undefined),
	// no options, and each target, which a validator writes only if baked,
	// and a fallback, which it ignores only where no fallback writes it
	jsonSchemaByOptions: [
		{},
		{ target: "draft-2020-12" },
		{ target: "draft-07" },
		{ fallback: keepBase },
		{ target: "draft-2020-12", fallback: { date: keepBase } }
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
			standard: observe(() => standardOutcomeOf(t, input), undefined)
		})
	}
}

// whether a Standard Schema failure's issues are those of the validator's
// errors, which traverse compares with their text, as errors "first" compares
// the issues added rather than those grouped by path
const standardOutcomeOf = (t: Validator, input: unknown): unknown => {
	const result = t["~standard"].validate(cloneInput(input))
	if (!result.issues) return result
	const issues = keptIssuesOf({ issues: result.issues } as never)
	const errors: any = traverse(t, cloneInput(input))
	return isErrors(errors) && isEqual(issues, keptIssuesOf(errors)) ?
			{ failedWithItsErrors: true }
		:	{ issues }
}

const hasIssues = (observation: unknown): boolean =>
	hasDomain(observation, "object") && "issues" in observation

// whether a validation returned its errors, unless a callback threw
const fails = (observation: unknown): boolean =>
	hasIssues(observation) && !("threw" in (observation as object))

type Errors = "all" | "first" | "none"

const testedErrors: Errors = testedOptions.errors ?? "all"

const erroringScopes = new Map<Errors, BaseScope>()

// a scope validating with errors, unless a Type's own already does
const erroringScopeOf = (errors: Errors): BaseScope | undefined => {
	if (errors === "all" && testedErrors === "all") return
	let $ = erroringScopes.get(errors)
	if (!$) erroringScopes.set(errors, ($ = schemaScope({}, { errors })))
	return $
}

// scopes writing in place as the build does, failing as copying does
const inPlaceScopesByOnFail = new Map<unknown, Map<Errors, BaseScope>>()

const inPlaceScopeOf = (node: BaseRoot, errors: Errors): BaseScope => {
	const { onFail } = (erroringScopeOf(testedErrors) ?? node.$).cfg
	let scopes = inPlaceScopesByOnFail.get(onFail)
	if (!scopes) inPlaceScopesByOnFail.set(onFail, (scopes = new Map()))
	let $ = scopes.get(errors)
	if (!$)
		scopes.set(errors, ($ = schemaScope({}, { errors, mutatesInput, onFail })))
	return $
}

// an alias stays in the scope resolving it, so its resolution is bound, and
// one writing in place is compiled as its Scope would compile it
const validatedOf = (
	node: BaseRoot,
	inPlace = false,
	errors = testedErrors
): BaseRoot => {
	const $ = inPlace ? inPlaceScopeOf(node, errors) : erroringScopeOf(errors)
	if (!$) return node
	let resolved = node
	while (resolved.is("alias")) resolved = resolved.resolution
	const bound = $.bindRef(resolved)
	return inPlace ? $.fin(bound) : bound
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
	// with errors "all", one of whose issues errors "first" reports
	allCalls?: (ReturnType<typeof observeCall> | undefined)[]
	inPlaceAllCalls?: (ReturnType<typeof observeCall> | undefined)[]
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
	}),
	...(firstIssue && {
		allCalls: observeCalls(validatedOf(node, false, "all"), inputs),
		...(mutatesInput && {
			inPlaceAllCalls: observeCalls(validatedOf(node, true, "all"), inputs)
		})
	})
})

type Call = ReturnType<typeof observeCall>

// arktype's issues, or those of a Standard Schema result
const reportedOf = (observation: any): unknown[] | undefined =>
	observation?.issues ?? observation?.out?.issues

const withReported = (observation: any, issues: unknown[]) =>
	"issues" in observation ?
		{ ...observation, issues }
	:	{ ...observation, out: { ...observation.out, issues } }

// errors "all"'s observation with only an alike issue, and its texts, at the
// path of the one reported
const withAlike = (observation: any, alike: any, reported: any) => {
	const withIssue = withReported(observation, [reported])
	if (!observation.texts) return withIssue
	const from = `${pathKeyOf(alike.path)}\0`
	const to = `${pathKeyOf(reported.path)}\0`
	// another issue at the same path, like a pattern beside a minLength, isn't
	// the one reported, but an intersection's are its own
	const isAlike = (at: string) =>
		alike.code === "intersection" ?
			at.startsWith(from)
		:	at === from + alike.code
	return {
		...withIssue,
		texts: observation.texts.flatMap((text: { at: string }) =>
			isAlike(text.at) ? [{ ...text, at: to + text.at.slice(from.length) }] : []
		)
	}
}

const valueAt = (input: unknown, path: readonly PropertyKey[]): unknown =>
	path.reduce((value: any, k) => value?.[k], input)

// writing in place, errors "all" goes on to write data errors "first" left
// as it was input
const isAlikeData = (input: unknown, all: any, first: any): boolean =>
	isEqual(all.data, first.data) ||
	(mutatesInput !== false &&
		[first.path, first.path.slice(0, -1)].some(path =>
			isEqual(valueAt(input, path), first.data)
		))

// errors "all" reports an object reached at two paths at the one it reaches
// first, so the issue at the other is alike where both paths reach that object
const isAlikeIssue = (input: unknown, all: any, first: any): boolean => {
	if (isEqual(all, first)) return true
	if (all.code !== first.code || !isAlikeData(input, all, first)) return false
	if (isEqual(all.path, first.path)) return true
	for (let n = 1; n < Math.min(all.path.length, first.path.length); n++) {
		if (!isEqual(all.path.slice(-n), first.path.slice(-n))) return false
		const reached = valueAt(input, all.path.slice(0, -n))
		if (
			typeof reached === "object" &&
			reached !== null &&
			reached === valueAt(input, first.path.slice(0, -n))
		)
			return true
	}
	return false
}

// a first-issue call reports exactly one of the issues errors "all" does
const reportsOneOf = (input: unknown, all: Call, first: Call): boolean =>
	isEqual(Object.keys(all), Object.keys(first)) &&
	Object.entries(all).every(([k, observed]) => {
		const reported = first[k as keyof Call]
		const issues = reportedOf(reported)
		// a Standard result groups its issues, any one added of which is reported
		const added = reportedOf(k === "standard" ? all.traverse : observed)
		const alike =
			issues?.length === 1 &&
			added?.find(issue => isAlikeIssue(input, issue, issues[0]))
		return alike ?
				isEqual(withAlike(observed, alike, issues[0]), reported)
			:	isEqual(observed, reported)
	})

// what a precompiled call is compared with: under errors "first", arktype's
// call with errors "all"
const expectedOf = (arktype: Observations, i: number): Call | undefined =>
	firstIssue ?
		(arktype.inPlaceAllCalls ?? arktype.allCalls!)[i]
	:	(arktype.inPlaceCalls ?? arktype.calls)[i]

const agrees = (input: unknown, expected: Call, call: Call): boolean =>
	firstIssue ?
		reportsOneOf(input, expected, call)
	:	isEqual(
			expected,
			Object.fromEntries(
				Object.entries(call).map(([k, observed]) => [
					k,
					maskExpecteds(expected[k as keyof Call], observed)
				])
			)
		)

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
	// arktype's first issue is one errors "all" reports too
	for (const [i, input] of inputs.entries()) {
		const all = expectedOf(arktype, i)
		const first = (arktype.inPlaceCalls ?? arktype.calls)[i]
		if (firstIssue && all && first && !agrees(input, all, first)) {
			result.disagreements.push(
				inspect(
					{
						expression: node.expression,
						observation: "first",
						input,
						all,
						first
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
			const expected = expectedOf(arktype, i)
			const actual = observeCall(validator, input)
			if (expected && agrees(input, expected, actual)) continue
			if (
				!expected ||
				holdsArkValue(actual) ||
				returnsForeignErrors(validator, input) ||
				(jsonInput && holdsUncounted(input))
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
