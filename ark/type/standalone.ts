import { hasArkKind } from "@ark/schema"
// a build writes in place as arktype/mutatesInput's marks say
import "./mutatesInput.ts"
import { arkKindOf, ParseError } from "@ark/util"
import * as runtime from "./runtimeExports.ts"
import { StandaloneArtifact } from "./standalone/artifact.ts"
import {
	bakingOf,
	isCreatedByRuntime,
	writeFunction,
	writeLazyRead,
	type Baking,
	type ExportedValue,
	type StandaloneExport,
	type StandaloneFactory,
	type StandaloneModules,
	type StandaloneOptions
} from "./standalone/baking.ts"
import { keyOf } from "./standalone/keys.ts"
import {
	mergeUnits,
	noInlineOf,
	runtimeImport,
	writeImports,
	writeModule,
	writeSections,
	type SharedModule
} from "./standalone/modules.ts"
export * from "./standalone/artifact.ts"
export * from "./standalone/baking.ts"
export * from "./standalone/combinators.ts"
export * from "./standalone/creators.ts"
export * from "./standalone/keys.ts"
export * from "./standalone/compilers.ts"
export * from "./standalone/modules.ts"
export * from "./standalone/sites.ts"
export * from "./standalone/units.ts"
export * from "./standalone/values.ts"

// read for nothing but its name, so a runtime from another version fails to link
const versionExport = Object.keys(runtime).find(name =>
	name.startsWith("precompiledForArktype_")
)!

const versionImport = `import { ${versionExport} } from "arktype/runtime"\n() => ${versionExport};`

/** an ES module of getters and factories for each export */
export const precompileStandalone = (
	exports: Record<string, StandaloneExport>,
	opts: StandaloneOptions = {}
): StandaloneModules => {
	const { sections, shared, imports, ...written } = writeArtifact(
		exports,
		opts,
		false
	)
	// nothing outside the artifact reads its units
	mergeUnits(shared, imports, opts)
	return {
		code: writeSections([
			`${runtimeImport}\n${versionImport}`,
			...Object.values(shared).map(module => module.declarations.join("\n\n")),
			...sections
		]),
		modules: {},
		...written
	}
}

export const precompileStandaloneModules = (
	exports: Record<string, StandaloneExport>,
	opts: StandaloneOptions = {}
): StandaloneModules => {
	const { sections, shared, imports, ...written } = writeArtifact(
		exports,
		opts,
		true
	)
	// a module is shared by every artifact reading it, so none merges another's units
	const modules: Record<string, string> = {}
	for (const specifier in shared)
		modules[specifier] = writeModule(shared[specifier])
	return {
		code: writeSections([
			`${runtimeImport}\n${versionImport}\n${writeImports(imports)}`,
			...sections
		]),
		modules,
		...written
	}
}

const writeArtifact = (
	exports: Record<string, StandaloneExport>,
	opts: StandaloneOptions,
	isModular: boolean
) => {
	const shared: Record<string, SharedModule> = {}
	const imports: Record<string, string[]> = {}
	const folds: StandaloneModules["folds"] = {}
	const checking: string[] = []
	const { configured } = opts
	// a lazy or hoisted creation must be called, so isn't exported as a value
	const values: string[] | undefined =
		isModular && opts.values && opts.lazy === false && !opts.hoisted ?
			[]
		:	undefined
	const baking = bakingOf(exports, opts, isModular)
	const types: Record<string, ExportedValue> = {}
	const templates = new Set<unknown>()
	const folded = new Map<
		string,
		[index: number, artifact: StandaloneArtifact]
	>()
	const factories: (string | (() => string))[] = []
	const calls: StandaloneModules["calls"] = {}
	const tables = new Set<number>()
	const artifactsByName = new Map<string, StandaloneArtifact>()
	// a trial write: foldable if its code holds nothing received
	const canFold = (name: string, factory: StandaloneFactory): boolean => {
		if (
			// as unknown: narrowing to BaseRoot is too deep for TypeScript
			!hasArkKind(factory.type as unknown, "root") ||
			factory.defaultChecks?.length ||
			// runtime.rekeyed creates a template's copies with runtime.createValidator
			(!isCreatedByRuntime(baking.members, baking) &&
				keyOf(factory.type)[1].length)
		)
			return false
		const trial = new StandaloneArtifact(
			{ [name]: factory.type },
			Object.create(shared),
			{},
			baking
		)
		trial.templates.add(factory.type)
		try {
			trial.writeCreateBody(configured)
			return true
		} catch (e) {
			if (e instanceof ParseError) return false
			throw e
		}
	}
	let index = 0
	for (const [name, value] of Object.entries(exports)) {
		if (arkKindOf(value) !== undefined) {
			types[name] = value as never
			continue
		}
		if ("member" in value) {
			const artifact = new StandaloneArtifact(
				{},
				shared,
				imports,
				baking,
				value
			)
			artifactsByName.set(name, artifact)
			factories.push(
				artifact.writeIntrospection(value, index, configured),
				writeExport(name, index)
			)
		} else {
			const factory = value as StandaloneFactory
			const artifact = new StandaloneArtifact(
				{ [name]: factory.type },
				shared,
				imports,
				baking,
				factory
			)
			artifactsByName.set(name, artifact)
			artifact.receive(factory.params)
			if (canFold(name, factory)) {
				const { type } = factory
				folded.set(name, [index, artifact])
				if (keyOf(type)[1].length) templates.add(type)
				types[name] = type
				factories.push(() => writeFolded(name))
			} else {
				if (factory.internedBy !== undefined) tables.add(factory.internedBy)
				factories.push(
					artifact.writeFactory(index, configured),
					writeExport(name, index)
				)
			}
		}
		index++
	}
	// a folded factory's site reads what it creates where it checks nothing
	const isUnchecked = (name: string) => {
		const artifact = folded.get(name)?.[1]
		const rekeying = artifact?.writeRekeying("created")
		return (
			!rekeying || (rekeying.length === 1 && rekeying[0] === "return created")
		)
	}
	// a size build's sites create validators where they can, as a lazy build's on load
	const createsInPlace = (name: string) =>
		isModular &&
		!!opts.values &&
		!baking.hoisted &&
		isUnchecked(name) &&
		(opts.lazy === false ? baking.shortest : !!opts.readOnLoad?.includes(name))
	const [creations, reads] = writeCreations(
		types,
		templates,
		folded,
		opts,
		baking,
		shared,
		imports,
		values,
		createsInPlace,
		calls
	)
	// a factory checking nothing it's passed is read as what it returns
	const valueOf = (name: string): string | undefined => {
		if (!values) return
		const read = readOf(...reads[name])
		const [returned, ...checks] = folded.get(name)![1].writeRekeying(read)
		return !checks.length && returned === `return ${read}` ? read : undefined
	}
	// folds differing only by index share one function
	const sharersByCode = new Map<string, string[]>()
	for (const [name, [, artifact]] of folded) {
		if (name in calls) continue
		const [creation, position] = reads[name]
		if (position === undefined || valueOf(name) !== undefined) continue
		const code = artifact.writeRekeying(`${creation}[index]`).join("\n")
		sharersByCode.set(code, [...(sharersByCode.get(code) ?? []), name])
	}
	for (const sharers of sharersByCode.values()) {
		if (sharers.length < 2) continue
		for (const name of sharers) folds[name] = [sharers[0], reads[name][1]!]
	}
	const writeFolded = (name: string) => {
		if (name in calls) return ""
		const [index, artifact] = folded.get(name)!
		const [creation, position] = reads[name]
		const fold = folds[name]
		if (fold && fold[0] !== name) return ""
		const value = valueOf(name)
		if (value !== undefined) {
			values!.push(name)
			return /^[\w$]+$/.test(value) ?
					`export { ${value} as ${exportNameOf(name)} }`
				:	`const factory${index} = ${value}\n\n${writeExport(name, index)}`
		}
		const params = artifact.factory!.params.map((_, i) => `p${i}`)
		if (fold) params.unshift("index")
		return `${writeFunction(baking, `factory${index}`, params.join(", "), artifact.writeRekeying(fold ? `${creation}[index]` : readOf(creation, position)).join("\n\n"))}

${writeExport(name, index)}`
	}
	const called = [...new Set(Object.values(calls).flat())]
	const sections = [
		...creations,
		called.length ? `export { ${called.join(", ")} }` : "",
		// an import cycle can reach a factory before this runs
		[...tables].map(table => `var interned${table}`).join("\n"),
		...factories.map(factory =>
			typeof factory === "string" ? factory : factory()
		)
	]
	for (const [name, artifact] of artifactsByName)
		if (artifact.checksAtCreation) checking.push(name)
	return {
		sections,
		shared,
		imports,
		folds,
		checking,
		values: values ?? [],
		calls,
		issues: baking.issues
	}
}

interface Creation {
	indices: number[]
	values: Set<unknown>
	body: string
}

const writeCreation = (baking: Baking, index: number, body: string) =>
	baking.createsLazily ?
		`var created${index}\n\n${writeFunction(baking, `create${index}`, "", body)}`
	:	`const created${index} = ${noInlineOf(baking.shortest)}/* @__PURE__ */ (() => {\n${body}\n})()`

type CreationRead = [creation: string, position: number | undefined]

const readOf = (...[creation, position]: CreationRead) =>
	position === undefined ? creation : `${creation}[${position}]`

// bare where it can be, as some bundlers, like Farm, take no string export name
const exportNameOf = (name: string) =>
	/^[$A-Z_a-z][\w$]*$/.test(name) ? name : JSON.stringify(name)

const writeExport = (name: string, index: number) =>
	`export { factory${index} as ${exportNameOf(name)} }`

const writeCreations = (
	types: Record<string, ExportedValue>,
	templates: ReadonlySet<unknown>,
	folded: ReadonlyMap<string, unknown>,
	{ configured }: StandaloneOptions,
	baking: Baking,
	shared: Record<string, SharedModule>,
	imports: Record<string, string[]>,
	values: string[] | undefined,
	createsInPlace: (name: string) => boolean,
	calls: StandaloneModules["calls"]
): [code: string[], reads: Record<string, CreationRead>] => {
	const names = Object.keys(types)
	const artifactOf = (indices: number[]) => {
		const artifact = new StandaloneArtifact(
			Object.fromEntries(indices.map(i => [names[i], types[names[i]]])),
			shared,
			imports,
			baking
		)
		for (const template of templates) artifact.templates.add(template)
		return artifact
	}
	const reads: Record<string, CreationRead> = {}
	let creations: Creation[] = []
	for (let i = 0; i < names.length; i++) {
		const artifact = artifactOf([i])
		const body = artifact.writeCreateBody(configured)
		const values = artifact.comparedValues
		const joined = creations.filter(creation =>
			values.some(value => creation.values.has(value))
		)
		creations = creations.filter(creation => !joined.includes(creation))
		creations.push({
			indices: [...joined.flatMap(creation => creation.indices), i].sort(
				(l, r) => l - r
			),
			values: new Set([
				...joined.flatMap(creation => [...creation.values]),
				...values
			]),
			body
		})
	}
	const code: string[] = []
	for (const creation of creations.sort(
		(l, r) => l.indices[0] - r.indices[0]
	)) {
		const [index] = creation.indices
		const created =
			creation.indices.every(i => createsInPlace(names[i])) ?
				artifactOf(creation.indices).writeCalls(configured)
			:	undefined
		if (created) {
			for (const [position, i] of creation.indices.entries())
				calls[names[i]] = created[position]
			continue
		}
		const isShared = creation.indices.length > 1
		const body =
			isShared ?
				artifactOf(creation.indices).writeCreateBody(configured)
			:	creation.body
		const isInlined = baking.createsLazily && !isShared
		code.push(
			isInlined ? `var created${index}` : writeCreation(baking, index, body)
		)
		for (const [position, i] of creation.indices.entries()) {
			reads[names[i]] = [
				isInlined ?
					writeLazyRead(
						`created${index}`,
						`${noInlineOf(baking.shortest)}(() => {\n${body}\n})()`
					)
				: baking.createsLazily ?
					writeLazyRead(`created${index}`, `create${index}()`)
				:	`created${index}`,
				isShared ? position : undefined
			]
		}
	}
	const getters = names.flatMap((name, i) => {
		if (folded.has(name) || name in calls) return []
		const read = readOf(...reads[name])
		values?.push(name)
		return values && /^[\w$]+$/.test(read) ?
				`export { ${read} as ${exportNameOf(name)} }`
			:	`${values ? `const get${i} = ${read}` : writeFunction(baking, `get${i}`, "", `\treturn ${read}`)}\n\nexport { get${i} as ${exportNameOf(name)} }`
	})
	return [[...code, getters.join("\n")], reads]
}
