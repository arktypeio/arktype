import {
	arkKind,
	defineLazily,
	flatMorph,
	hashOf,
	hasOwn,
	isThunk,
	ParseError,
	printable,
	throwInternalError,
	throwParseError,
	WeakCache,
	type Dict,
	type Fn,
	type Hkt,
	type JsonStructure,
	type anyOrNever,
	type array,
	type conform,
	type intersectUnion,
	type noSuggest,
	type satisfy,
	type show
} from "@ark/util"
import {
	mergeConfigs,
	resolveGlobalConfig,
	type ArkSchemaConfig,
	type ResolvedConfig
} from "./config.ts"
import {
	GenericRoot,
	LazyGenericBody,
	LazyGenericRoot,
	type GenericRootParser
} from "./generic.ts"
import { bootstrap } from "./intrinsic.ts"
import type { NodeInput, nodeOfKind, reducibleKindOf } from "./kinds.ts"
import {
	RootModule,
	bindModule,
	type InternalModule,
	type PreparsedNodeResolution,
	type SchemaModule,
	type instantiateRoot
} from "./module.ts"
import {
	referencesThroughAliases,
	rootApplyRuntimeOf,
	type BaseNode
} from "./node.ts"
import {
	nodesById,
	parseNode,
	registerNodeId,
	resolveDescription,
	withId,
	type AttachedParseContext,
	type BaseParseContext,
	type BaseParseContextInput,
	type BaseParseOptions
} from "./parse.ts"
import { parseSchema, type RootSchema } from "./parseSchema.ts"
import {
	isResolvable,
	resolveShallowAliases,
	type Alias
} from "./roots/alias.ts"
import type { BaseRoot } from "./roots/root.ts"
import type { Union } from "./roots/union.ts"
import type { Unit } from "./roots/unit.ts"
import { canJit, tryJit } from "./shared/compile.ts"
import { nodeKinds, type NodeKind } from "./shared/implement.ts"
import type { Locale } from "./shared/locale.ts"
import { $ark } from "./shared/registry.ts"
import { missingSetEngineMessage } from "./shared/sets.ts"
import type { Traversal } from "./shared/traversal.ts"
import {
	assertUnchecked,
	composing,
	defining,
	hasArkKind,
	inProgress,
	isNode,
	printSelfAsThis,
	resolving
} from "./shared/utils.ts"
import { bindPrecompiledUnits, precompile, precompileRoot } from "./units.ts"

export type InternalResolutions = Record<string, InternalResolution | undefined>

export type exportedNameOf<$> = Exclude<keyof $ & string, PrivateDeclaration>

export type resolvableReferenceIn<$> =
	[keyof $] extends [never] ? never
	: // checked without distributing, as most scopes have no key to filter
	[keyof $ & (PrivateDeclaration | noSuggest | "root")] extends [never] ?
		keyof $ & string
	:	| Exclude<
				keyof $ & string,
				// technically, root subtypes are resolvable, but there's never a good
				// reason to use them over the base alias
				PrivateDeclaration | noSuggest | "root"
		  >
		| privateAliasOf<Extract<keyof $, PrivateDeclaration>>

type privateAliasOf<k> =
	k extends PrivateDeclaration<infer alias> ? alias : never

export type resolveReference<reference extends resolvableReferenceIn<$>, $> =
	reference extends keyof $ ? $[reference] : $[`#${reference}` & keyof $]

export type flatResolutionsOf<$> = show<
	intersectUnion<
		resolvableReferenceIn<$> extends infer k ?
			k extends keyof $ & string ?
				resolutionsOfReference<k, $[k]>
			:	unknown
		:	unknown
	>
>

type resolutionsOfReference<k extends string, v> =
	[v] extends [{ [arkKind]: "module" }] ?
		[v] extends [anyOrNever] ?
			{ [_ in k]: v }
		:	prefixKeys<flatResolutionsOf<v>, k> & {
				[innerKey in keyof v as innerKey extends "root" ? k
				:	never]: v[innerKey]
			}
	:	{ [_ in k]: v }

type prefixKeys<o, prefix extends string> = {
	[k in keyof o & string as `${prefix}.${k}`]: o[k]
} & unknown

export type PrivateDeclaration<key extends string = string> = `#${key}`

export type InternalResolution = BaseRoot | GenericRoot | InternalModule

export type toInternalScope<$> = BaseScope<{
	[k in keyof $]: $[k] extends { [arkKind]: infer kind } ?
		[$[k]] extends [anyOrNever] ? BaseRoot
		: kind extends "generic" ? GenericRoot
		: kind extends "module" ? InternalModule
		: never
	:	BaseRoot
}>

type CachedResolution = BaseParseContext | BaseRoot | GenericRoot

const throwMismatchedNodeRootError = (expected: NodeKind, actual: NodeKind) =>
	throwParseError(
		`Node of kind ${actual} is not valid as a ${expected} definition`
	)

export const writeDuplicateAliasError = <alias extends string>(
	alias: alias
): writeDuplicateAliasError<alias> =>
	`#${alias} duplicates public alias ${alias}`

export type writeDuplicateAliasError<alias extends string> =
	`#${alias} duplicates public alias ${alias}`

export type AliasDefEntry = [name: string, defValue: unknown]

// Fallback counter for anonymous scopes; scopes are identified by instance
// identity rather than names to support HMR and multi-bundle environments.
let anonymousScopeCount = 0

// options whose non-default values need an arktype import
export type InstalledOption = "errors" | "mutatesInput"

export const writeMissingImportMessage = <
	option extends InstalledOption,
	value extends string
>(
	option: option,
	value: value
): writeMissingImportMessage<option, value> =>
	`${option}: ${value} requires import "arktype/${option}"`

export type writeMissingImportMessage<
	option extends InstalledOption,
	value extends string
> = `${option}: ${value} requires import "arktype/${option}"`

export type GlobalOnlyConfigOptionName = satisfy<
	keyof ArkSchemaConfig,
	| "dateAllowsInvalid"
	| "numberAllowsInfinity"
	| "numberAllowsNaN"
	| "onUndeclaredKey"
	| "keywords"
	| "locale"
>

const globalOnlyConfigOptionNames: readonly GlobalOnlyConfigOptionName[] = [
	"dateAllowsInvalid",
	"numberAllowsInfinity",
	"numberAllowsNaN",
	"onUndeclaredKey",
	"keywords",
	"locale"
]

export const writeGlobalOnlyConfigMessage = <
	name extends GlobalOnlyConfigOptionName
>(
	name: name
): writeGlobalOnlyConfigMessage<name> =>
	`${name} can only be configured globally, with configure()`

export type writeGlobalOnlyConfigMessage<
	name extends GlobalOnlyConfigOptionName
> = `${name} can only be configured globally, with configure()`

export interface ScopeOnlyConfigOptions {
	name?: string
	prereducedAliases?: boolean
}

export interface ArkSchemaScopeConfig
	extends Omit<ArkSchemaConfig, GlobalOnlyConfigOptionName>,
		ScopeOnlyConfigOptions {}

export interface ResolvedScopeConfig
	extends ResolvedConfig,
		ScopeOnlyConfigOptions {}

$ark.ambient ??= {} as never

const registerParseContext = <ctx extends BaseParseContext>(ctx: ctx): ctx =>
	(nodesById[ctx.id] = ctx)

export abstract class BaseScope<$ extends {} = {}> {
	readonly name: string
	readonly isBuiltin: boolean
	readonly scopeConfig: ArkSchemaScopeConfig | undefined

	get [arkKind](): "scope" {
		return "scope"
	}

	/** `refsById`, once read */
	private _refsById: { [id: string]: BaseNode } | undefined
	// collected when first read
	get refsById(): { [id: string]: BaseNode } {
		if (!this._refsById && this._exported) {
			this._refsById = {}
			for (const name in this._exported) {
				const resolution = this._exported[name]
				if (isNode(resolution))
					addReferences(this._refsById, resolution.refsById)
			}
		}
		return this._refsById ?? {}
	}

	private _references: readonly BaseNode[] | undefined
	get references(): readonly BaseNode[] {
		if (!this._references && this._exported) {
			const references = Object.values(this.refsById)
			this._references =
				this._lazy ? references : referencesThroughAliases(references)
		}
		return this._references ?? []
	}

	readonly resolutions: {
		[alias: string]: CachedResolution | undefined
	} = Object.create(null)
	private readonly boundReferences = new WeakMap<
		BaseNode | GenericRoot,
		BaseNode | GenericRoot
	>()

	exportedNames: string[] = []
	readonly aliases: Record<string, unknown> = {}
	resolved = false
	readonly nodesByKey: WeakCache<BaseNode> = new WeakCache()

	constructor(
		/** The set of names defined at the root-level of the scope mapped to their
		 * corresponding definitions.**/
		def: Record<string, unknown>,
		config?: ArkSchemaScopeConfig,
		isBuiltin = false
	) {
		this.name = config?.name ?? `anonymousScope${anonymousScopeCount++}`
		this.isBuiltin = isBuiltin
		this.scopeConfig = config
		// a scope's would be honored for some and silently ignored for others
		for (const k of globalOnlyConfigOptionNames) {
			if ((config as ArkSchemaConfig | undefined)?.[k] !== undefined)
				throwParseError(writeGlobalOnlyConfigMessage(k))
		}

		const aliasEntries = Object.entries(def).map(entry =>
			this.preparseEntry(...entry)
		)

		for (const [k, v] of aliasEntries) {
			let name = k
			if (k[0] === "#") {
				name = k.slice(1)
				if (hasOwn(this.aliases, name))
					throwParseError(writeDuplicateAliasError(name))
				this.aliases[name] = v
			} else {
				if (hasOwn(this.aliases, name))
					throwParseError(writeDuplicateAliasError(k))
				this.aliases[name] = v
				this.exportedNames.push(name)
			}
			if (
				!hasArkKind(v, "module") &&
				!hasArkKind(v, "generic") &&
				!isThunk(v)
			) {
				const preparsed = this.preparseOwn(v, { alias: name })
				this.resolutions[name] =
					hasArkKind(preparsed, "root") ?
						this.bindRef(preparsed)
					:	this.createParseCtx(preparsed)
			}
		}
	}

	get config(): ArkSchemaScopeConfig {
		return mergeConfigs($ark.config, this.scopeConfig)
	}

	/** its config, with defaults and global config applied */
	get cfg(): ResolvedScopeConfig {
		// the first read fixes the global config, so configure throws after it
		const globalConfig = ($ark.cfg ??= resolveGlobalConfig($ark.defaultConfig))
		const cfg = mergeConfigs(globalConfig, this.scopeConfig)
		const missing: InstalledOption | undefined =
			cfg.errors !== "all" && !$ark.errorModes ? "errors"
			: cfg.mutatesInput && !$ark.inPlace ? "mutatesInput"
			: undefined
		if (missing) {
			throwParseError(
				writeMissingImportMessage(missing, printable(cfg[missing]))
			)
		}
		// locale is global-only, though an untyped config can pass one
		if (cfg.locale !== globalConfig.locale)
			(cfg as { locale: Locale }).locale = globalConfig.locale
		return this.memo("cfg", cfg)
	}

	get intrinsic(): Omit<typeof $ark.intrinsic, `json${string}`> {
		// intrinsic won't be available during bootstrapping,  so we lie
		// about the type here as an extrnal convenience
		const bound = {} as never
		const intrinsic = $ark.intrinsic
		for (const k in intrinsic) {
			// don't include cyclic aliases from JSON scope
			if (k.startsWith("json")) continue
			defineLazily(bound, k, () =>
				this.bindKeyword(intrinsic[k as keyof typeof intrinsic])
			)
		}
		return this.memo("intrinsic", bound)
	}

	/** defines `name` as an own property holding `value`, so the getter it shadows runs once */
	protected memo<name extends keyof this>(
		name: name,
		value: this[name]
	): this[name] {
		if (Object.isExtensible(this)) Object.defineProperty(this, name, { value })
		return value
	}

	get internal(): this {
		return this
	}

	private _json: JsonStructure | undefined
	get json(): JsonStructure {
		if (!this._json) {
			this.export()
			this._json = resolutionsToJson(this._exported!)
		}
		return this._json
	}

	defineSchema<def extends RootSchema>(def: def): def {
		return def
	}

	generic: GenericRootParser = (...params) => {
		const $: BaseScope = this as never
		return (def: unknown, possibleHkt?: Hkt.constructor) =>
			new GenericRoot(
				params,
				possibleHkt ?
					// wrapped rather than bound, since binding reads the body's name and length
					new LazyGenericBody(args => (def as Fn)(args))
				:	def,
				$,
				$,
				possibleHkt ?? null
			) as never
	}

	units = (values: array, opts?: BaseParseOptions): BaseRoot => {
		const uniqueValues: unknown[] = []
		for (const value of values)
			if (!uniqueValues.includes(value)) uniqueValues.push(value)

		const branches = uniqueValues.map(unit => this.node("unit", { unit }, opts))
		return this.node(
			"union",
			{ branches },
			{
				...opts,
				prereduced: true
			}
		)
	}

	lazilyResolve(
		resolve: () => BaseRoot,
		reference: string = registerNodeId("synthetic"),
		operator?: string,
		operands?: readonly BaseRoot[]
	): Alias.Node {
		return this.node(
			"alias",
			operator && operands ?
				{ reference, resolve, operator, operands }
			:	{ reference, resolve },
			{ prereduced: true }
		)
	}

	schema = (schema: RootSchema, opts?: BaseParseOptions): BaseRoot =>
		this.finalize(parseSchema(schema, this, opts))

	/** `reference` copied into this scope, unless it's already this scope's or an alias */
	bindRef<reference extends BaseNode | GenericRoot>(
		reference: reference
	): reference {
		if (reference.$ === this || (isNode(reference) && reference.is("alias")))
			return reference
		// bound once per scope
		let bound = this.boundReferences.get(reference)
		if (!bound) {
			bound =
				isNode(reference) ?
					composing(() => {
						const copy = new (reference.constructor as any)(reference, this)
						// a bound node keeps the descriptions of the scope that created it
						if (reference.keptDesc || !this.describesLike(reference.$)) {
							copy.keptDesc = true
							copy.cache.description = reference.description
						}
						return resolveDescription(copy as BaseNode)
					})
				:	new GenericRoot(
						reference.params as never,
						reference.bodyDef,
						reference.$,
						this as never,
						reference.hkt,
						reference.alias
					)
			this.boundReferences.set(reference, bound)
		}
		return bound as never
	}

	// a keyword resolved by name is described by this scope all the way down,
	// except through a cycle, which would be printed unrolled
	bindKeyword<reference extends BaseNode | GenericRoot>(
		reference: reference
	): reference {
		if (
			!isNode(reference) ||
			reference.isCyclic ||
			this.describesLike(reference.$)
		)
			return this.bindRef(reference)
		return reference.transform((kind, inner) => inner, {
			bindScope: this,
			prereduced: true
		}) as never
	}

	private describesLike($: BaseScope): boolean {
		return nodeKinds.every(
			kind => this.cfg[kind].description === $.cfg[kind].description
		)
	}

	resolveRoot(name: string): BaseRoot {
		return (
			this.maybeResolveRoot(name) ??
			throwParseError(writeUnresolvableMessage(name))
		)
	}

	maybeResolveRoot(name: string): BaseRoot | undefined {
		const result = this.maybeResolve(name)
		if (hasArkKind(result, "generic")) return
		return result
	}

	/** If name is a valid reference to a submodule alias, return its resolution  */
	protected maybeResolveSubalias(
		name: string
	): BaseRoot | GenericRoot | undefined {
		const resolution =
			(this._lazy && maybeResolveExport(this._lazy, name)) ??
			maybeResolveSubalias(this.aliases, name)
		if (resolution) return resolution
		const keyword = maybeResolveSubalias(this.ambient, name)
		return keyword && (this.resolutions[name] = this.bindKeyword(keyword))
	}

	get ambient(): InternalModule {
		return $ark.ambient as never
	}

	private aliasOf(ctx: BaseParseContext): Alias.Node {
		const alias = this.node(
			"alias",
			{ reference: ctx.id },
			{ prereduced: true }
		)
		if (!ctx.closesCycle) alias.closesCycle = false
		return alias
	}

	private resolveContext(
		name: string,
		ctx: BaseParseContext,
		node: BaseRoot
	): BaseRoot {
		if (ctx.isReferencedById) {
			if (nodesById[node.id] !== node) node = withId(node, ctx.id)
			nodesById[ctx.id] = node
		} else delete nodesById[ctx.id]
		return (this.resolutions[name] = node)
	}

	private resolvePending(name: string, pending: BaseRoot): BaseRoot {
		if (inProgress.definitions && !isResolvable(pending))
			return this.node("alias", { reference: pending.id }, { prereduced: true })
		const ctx = nodesById[pending.id] as BaseParseContext
		const mark = $ark.reached?.mark()
		const resolution = resolving(() =>
			this.resolveContext(name, ctx, resolveShallowAliases(pending))
		)
		$ark.reached?.store(mark, this.resolutions, name)
		return resolution
	}

	maybeResolve(
		name: string
	): Exclude<CachedResolution, BaseParseContext> | undefined {
		const cached = this.resolutions[name]
		if (cached && !hasArkKind(cached, "context")) {
			$ark.reached?.cached(this.resolutions, name)
			if (hasArkKind(cached, "root") && cached.topAlias)
				return this.resolvePending(name, cached)
			return this.bindRef(cached)
		}
		const mark = $ark.reached?.mark()
		const resolution = this.resolveUncached(name, cached, mark)
		$ark.reached?.store(mark, this.resolutions, name)
		return resolution
	}

	private resolveUncached(
		name: string,
		cached: BaseParseContext | undefined,
		mark: number | undefined
	): Exclude<CachedResolution, BaseParseContext> | undefined {
		if (hasOwn(this.aliases, name)) $ark.reached?.alias(this, name)
		if (cached) {
			const v = cached
			if (v.phase === "resolving" || v.phase === "member") {
				reach(v)
				if (v.phase === "resolving") v.closesCycle = true
				return this.aliasOf(v)
			}
			if (v.phase === "failed") throw v.error
			if (v.phase === "resolved") {
				return throwInternalError(
					`Unexpected resolved context for was uncached by its scope: ${printable(v)}`
				)
			}
			registerParseContext(v).phase = "resolving"
			v.index = v.lowlink = openDefinitions.push(v) - 1
			const membersStart = openMembers.length
			let node: BaseRoot
			try {
				node = this.parseOpenDef(v.def, v)
			} catch (e) {
				// reset so the next reference reparses it and throws the same error
				v.phase = "unresolved"
				throw e
			} finally {
				openDefinitions.pop()
			}
			reach(v)
			if (v.lowlink < v.index && !node.topAlias) {
				v.phase = "member"
				v.resolution = node
				openMembers.push(v)
				return this.aliasOf(v)
			}
			v.phase = "resolved"
			const component = [v]
			try {
				return resolving(() => {
					// it reaches no definition still open, so its component closes with it
					if (v.lowlink === v.index) {
						for (const member of openMembers.splice(membersStart)) {
							component.push(member)
							member.phase = "resolved"
							member.$.resolveContext(member.alias!, member, member.resolution!)
							$ark.reached?.store(mark, member.$.resolutions, member.alias)
							delete member.resolution
						}
					}
					return node.topAlias ?
							this.resolvePending(
								name,
								(this.resolutions[name] = withId(node, v.id))
							)
						:	this.resolveContext(name, v, node)
				})
			} catch (e) {
				// a deferred check failed; reparsing would reuse checked nodes
				for (const ctx of component) {
					ctx.phase = "failed"
					ctx.error = e
					ctx.$.resolutions[ctx.alias!] = ctx
				}
				throw e
			}
		}
		const isScopeAlias = hasOwn(this.aliases, name)
		let def: unknown =
			isScopeAlias ? this.aliases[name]
			: hasOwn(this.ambient, name) ? this.ambient[name]
			: undefined

		if (!def) return this.maybeResolveSubalias(name)

		// a reference to a thunk's alias while it's called is a cycle, but a
		// generic's declaration is called again
		if (isScopeAlias && isThunk(def) && !(def instanceof LazyGenericRoot)) {
			const preparsed = this.preparseOwn(def, { alias: name })
			const ctx = registerParseContext(
				this.createParseCtx(preparsed as BaseParseContextInput)
			)
			this.resolutions[name] = ctx
			ctx.phase = "resolving"
			try {
				def = defining(() => this.normalizeScopeValue(ctx.def))
			} finally {
				// if the call throws, its context stays registered so an alias parsed
				// during it resolves by name
				delete this.resolutions[name]
			}
			if (!hasArkKind(def, "generic") && !hasArkKind(def, "module")) {
				ctx.def = def
				ctx.phase = "unresolved"
				this.resolutions[name] = ctx
				// parsing its definition discards checks still open, so they're made first
				assertUnchecked()
				return this.maybeResolve(name)
			}
			delete nodesById[ctx.id]
		} else def = this.normalizeScopeValue(def)

		if (hasArkKind(def, "generic")) {
			const generic = (this.resolutions[name] = this.bindRef(def))
			generic.alias ??= name
			// instantiated once cached, so its errors surface here and its body can reference it
			try {
				void generic.baseInstance
			} catch (e) {
				delete this.resolutions[name]
				throw e
			}
			return generic
		}

		if (hasArkKind(def, "module")) {
			if (!def.root) throwParseError(writeMissingSubmoduleAccessMessage(name))
			return (this.resolutions[name] = this.finalize(
				isScopeAlias ? this.bindRef(def.root) : this.bindKeyword(def.root)
			))
		}

		return (this.resolutions[name] =
			isScopeAlias ?
				this.parse(def, { alias: name })
			:	this.finalize(this.bindKeyword(def as BaseRoot)))
	}

	protected createParseCtx<input extends BaseParseContextInput>(
		input: input
	): input & AttachedParseContext {
		bootstrap()
		const ctx = input as input & AttachedParseContext
		ctx[arkKind] = "context"
		ctx.$ = this as never
		ctx.id = input.id ?? registerNodeId(input.prefix)
		ctx.phase = "unresolved"
		return ctx
	}

	traversal(root: unknown): Traversal {
		return new (rootApplyRuntimeOf(this.cfg).Traversal)(root, this.cfg)
	}

	import(): SchemaModule<{
		[k in exportedNameOf<$> as PrivateDeclaration<k>]: $[k]
	}>
	import<names extends exportedNameOf<$>[]>(
		...names: names
	): SchemaModule<
		{
			[k in names[number] as PrivateDeclaration<k>]: $[k]
		} & unknown
	>
	import(...names: string[]): SchemaModule {
		return new RootModule(
			flatMorph(this.export(...(names as any)), (alias, value) => [
				`#${alias}`,
				value
			]) as never
		) as never
	}

	unitFn: Fn | undefined

	get precompilation(): string | undefined {
		return this.unitFn?.toString()
	}

	private _exported: InternalResolutions | undefined
	private _exports: RootExportCache | undefined
	export(): SchemaModule<{ [k in exportedNameOf<$>]: $[k] }>
	export<names extends exportedNameOf<$>[]>(
		...names: names
	): SchemaModule<
		{
			[k in names[number]]: $[k]
		} & unknown
	>
	export(...names: string[]): SchemaModule {
		if (!this._exports) {
			const mark = $ark.reached?.mark()
			// an alias resolving can export again, which returns what's exported so far
			this._exports = {}
			try {
				for (const name of this.exportedNames) {
					const def = this.aliases[name]
					this._exports[name] =
						this._lazy ? this._lazy[name]
						: hasArkKind(def, "module") ? bindModule(def, this)
						: this.maybeResolve(name)!
				}
			} catch (e) {
				// so a later call throws the same error
				this._exports = undefined
				throw e
			}

			this._exported = resolutionsOfModule(this, this._exports)

			Object.assign(this.resolutions, this._exported)

			if (!this._lazy) {
				const hasAlias = Object.values(this._exported).some(
					resolution => isNode(resolution) && resolution.hasAlias
				)
				let uncompiled = hasAlias || bindPrecompiledUnits ? this.references : []
				if (bindPrecompiledUnits) {
					// inline-compiled branches bind on their own
					bindPrecompiledUnits(uncompiled)
					uncompiled = uncompiled.filter(node => !node.unitFn)
				}
				if (canJit(this.cfg)) {
					// resolving aliases can throw, so they compile on export
					if (uncompiled.some(node => node.hasAlias))
						this.unitFn = tryJit(() => precompile(uncompiled, this))
					else {
						for (const name in this._exported) {
							const resolution = this._exported[name]
							if (hasArkKind(resolution, "root") && !resolution.unitFn)
								resolution.deferJit()
						}
					}
				}
				this.resolved = true
			}
			$ark.reached?.store(mark, this, "export")
		} else $ark.reached?.cached(this, "export")
		const namesToExport = names.length ? names : this.exportedNames
		return new RootModule(
			flatMorph(namesToExport, (_, name) => [
				name,
				this._exports![name]
			]) as never
		) as never
	}

	resolve<name extends exportedNameOf<$>>(
		name: name
	): instantiateRoot<$[name]> {
		return (this._lazy ?? this.export())[name as never]
	}

	/** the module `exportLazily` returns, once read */
	private _lazy: InternalModule | undefined

	exportLazily(): SchemaModule<{ [k in exportedNameOf<$>]: $[k] }> {
		if (!this._lazy) {
			const exports = new RootModule({})
			const resolve = (name: string) => {
				const def = this.aliases[name]
				return hasArkKind(def, "module") ?
						bindModuleLazily(def, this)
					:	finalizeExport(this, this.maybeResolve(name)!)
			}
			for (const name of this.exportedNames)
				defineLazily(exports, name, resolve)
			this._lazy = exports as never
			this.resolved = true
		}
		return this._lazy as never
	}

	node = <kind extends NodeKind, prereduced extends boolean = false>(
		kind: kind,
		input: NodeInput<kind>,
		opts = {} as BaseParseOptions<prereduced>
	): nodeOfKind<prereduced extends true ? kind : reducibleKindOf<kind>> => {
		// nodes are functions, so a schema object is never one
		if (typeof (input as unknown) === "function" && isNode(input)) {
			return input.kind === kind ?
					(this.bindRef(input) as never)
				:	throwMismatchedNodeRootError(kind, input.kind)
		}

		if (kind === "union") {
			const union = input as Union.Inner
			const branches = union.branches.flatMap(branch =>
				(branch as BaseRoot).is("union") ?
					(branch as {} as Union.Node).branches
				:	branch
			)
			// a union of one branch is that branch
			if (branches.length === 1) return this.bindRef(branches[0]) as never
			// a set engine rejects overlapping branches that transform differently
			if (
				!union.ordered &&
				!$ark.sets &&
				branches.length > 1 &&
				branches.some(branch => branch.alters)
			)
				throwParseError(missingSetEngineMessage)
			input = { ...input, branches } as never
		}

		// -0 === 0, so a unit of either is the same type
		if (kind === "unit" && Object.is((input as Unit.Inner).unit, -0))
			input = { ...input, unit: 0 } as never

		bootstrap()
		return this.bindRef(
			parseNode({
				kind,
				def: input as NodeInput,
				$: this,
				id: opts.id,
				alias: opts.alias,
				prereduced: opts.prereduced
			})
		) as never
	}

	parse = (def: unknown, opts: BaseParseOptions = {}): BaseRoot =>
		this.finalize(this.parseDef(def, opts))

	/** parses a definition in this scope to a node */
	parseDef(def: unknown, opts: BaseParseOptions = {}): BaseRoot {
		if (hasArkKind(def, "root")) return this.bindRef(def)

		const ctxInputOrNode = this.preparseOwn(def, opts)
		if (hasArkKind(ctxInputOrNode, "root")) return this.bindRef(ctxInputOrNode)

		const ctx = registerParseContext(this.createParseCtx(ctxInputOrNode))
		let node = this.parseOpenDef(def, ctx)
		node = resolving(() => {
			if (node.topAlias && !inProgress.definitions)
				node = resolveShallowAliases(node)

			// if the node is recursive e.g. { box: "this" }, we need to make sure it
			// has the original id from context so that its references compile correctly
			if (ctx.isReferencedById) nodesById[ctx.id] = node = withId(node, ctx.id)
			else delete nodesById[ctx.id]
			return node
		})
		if (!ctx.isReferencedAsThis || ctx.name) return node
		// parsed again, since the nodes that reference it have printed `this`
		return printSelfAsThis(
			this.parseDef(def, {
				...opts,
				name: `${ctx.prefix}${hashOf(node.expression)}`
			}),
			node
		)
	}

	openSynthetic(name: string | undefined): BaseParseContext {
		return registerParseContext(
			this.createParseCtx({
				def: undefined,
				prefix: "synthetic",
				...(name && { name })
			})
		)
	}

	/** parses a definition in this scope while its aliases may still be open */
	private parseOpenDef(def: unknown, ctx: BaseParseContext): BaseRoot {
		return defining(() => this.bindRef(this.parseOwn(def, ctx)))
	}

	finalize<node extends BaseRoot>(node: node, jit = true): node {
		// an alias may reference a definition that is still being parsed,
		// e.g. Record<string, this>, so the outermost parse finalizes it
		if ((inProgress.definitions || inProgress.resolutions) && node.hasAlias)
			return node

		// resolving aliases can throw, so they compile on definition
		const references =
			node.hasAlias ? referencesThroughAliases(node.references) : undefined
		if (node.unitFn || !jit) return node
		bindPrecompiledUnits?.([node])
		if (node.unitFn || !canJit(this.cfg)) return node
		if (references) tryJit(() => precompileRoot(node, references))
		else node.deferJit()
		return node
	}

	jit(node: BaseNode): void {
		tryJit(() => precompileRoot(node, node.references))
		// compiling binds what it checked before, unless the host refused
		if (node.cache.preJit) {
			node.allows = node.cache.preJit
			node.cache.preJit = undefined
		}
	}

	protected abstract preparseOwn(
		def: unknown,
		opts: BaseParseOptions
	): BaseRoot | BaseParseContextInput

	abstract parseOwn(def: unknown, ctx: BaseParseContext): BaseRoot

	/** an alias's entry as the scope writes it, its generic params and keyword config applied, before it's parsed */
	protected abstract preparseEntry(k: string, v: unknown): AliasDefEntry

	protected abstract normalizeScopeValue(resolution: unknown): unknown
}

export class SchemaScope<$ extends {} = {}> extends BaseScope<$> {
	parseOwn(def: unknown, ctx: BaseParseContext): BaseRoot {
		return parseSchema(def, this, ctx.alias ? { alias: ctx.alias } : undefined)
	}

	protected preparseOwn(
		def: unknown,
		opts: BaseParseOptions
	): BaseRoot | BaseParseContextInput {
		return hasArkKind(def, "root") ? def : (
				{ ...opts, def, prefix: opts.alias ?? "schema" }
			)
	}

	protected preparseEntry(k: string, v: unknown): AliasDefEntry {
		return [k, v]
	}

	protected normalizeScopeValue(v: unknown): unknown {
		return v
	}
}

const bindModuleLazily = (
	module: InternalModule,
	$: BaseScope
): InternalModule => {
	const bound = new RootModule({})
	const resolve = (k: string) => {
		const resolution = module[k]
		return hasArkKind(resolution, "module") ?
				bindModuleLazily(resolution, $)
			:	finalizeExport($, $.bindRef(resolution as BaseRoot | GenericRoot))
	}
	for (const k in module) defineLazily(bound, k, resolve)
	return bound as never
}

export const finalizeExport = (
	$: BaseScope,
	resolution: BaseRoot | GenericRoot
): BaseRoot | GenericRoot =>
	hasArkKind(resolution, "root") ? $.finalize(resolution) : resolution

const openDefinitions: BaseParseContext[] = []
const openMembers: BaseParseContext[] = []

const reach = (ctx: BaseParseContext) => {
	const referencer = openDefinitions[openDefinitions.length - 1]
	if (referencer && ctx.lowlink! < referencer.lowlink!)
		referencer.lowlink = ctx.lowlink!
}

const maybeResolveExport = (
	exports: InternalModule,
	name: string
): BaseRoot | GenericRoot | undefined => {
	if (!name.includes(".")) return
	let resolution: unknown = exports
	for (const k of name.split(".")) {
		if (!hasArkKind(resolution, "module")) return
		resolution = (resolution as Dict)[k]
	}
	return hasArkKind(resolution, "root") || hasArkKind(resolution, "generic") ?
			resolution
		:	undefined
}

const addReferences = (
	base: BaseNode["refsById"],
	references: BaseNode["refsById"]
) => {
	for (const id in references) base[id] ??= references[id]
}

const resolutionsToJson = (resolutions: InternalResolutions): JsonStructure =>
	flatMorph(resolutions, (k, v) => [
		k,
		hasArkKind(v, "root") || hasArkKind(v, "generic") ? v.json
		: hasArkKind(v, "module") ? resolutionsToJson(v)
		: throwInternalError(`Unexpected resolution ${printable(v)}`)
	])

const maybeResolveSubalias = (
	base: Dict,
	name: string
): BaseRoot | GenericRoot | undefined => {
	const dotIndex = name.indexOf(".")
	if (dotIndex === -1) return

	const dotPrefix = name.slice(0, dotIndex)
	// if the name includes ".", but the prefix is not an alias, it
	// might be something like a decimal literal, so just fall through to return
	if (!hasOwn(base, dotPrefix)) return
	const prefixSchema = base[dotPrefix]
	if (!hasArkKind(prefixSchema, "module"))
		return throwParseError(writeNonSubmoduleDotMessage(dotPrefix))

	const subalias = name.slice(dotIndex + 1)
	const resolution =
		hasOwn(prefixSchema, subalias) ? prefixSchema[subalias] : undefined

	if (resolution === undefined)
		return maybeResolveSubalias(prefixSchema, subalias)

	if (hasArkKind(resolution, "root") || hasArkKind(resolution, "generic"))
		return resolution

	if (hasArkKind(resolution, "module")) {
		return (
			resolution.root ??
			throwParseError(writeMissingSubmoduleAccessMessage(name))
		)
	}

	throwInternalError(
		`Unexpected resolution for alias '${name}': ${printable(resolution)}`
	)
}

type instantiateAliases<aliases> = {
	[k in keyof aliases]: aliases[k] extends InternalResolution ? aliases[k]
	:	BaseRoot
} & unknown

export type SchemaScopeParser = <const aliases>(
	aliases: {
		[k in keyof aliases]: conform<
			aliases[k],
			RootSchema | PreparsedNodeResolution
		>
	},
	config?: ArkSchemaScopeConfig
) => BaseScope<instantiateAliases<aliases>>

export const schemaScope: SchemaScopeParser = (aliases, config) =>
	new SchemaScope(aliases, config)

export const rootSchemaScope: SchemaScope = new SchemaScope(
	{},
	{ name: "schema" },
	true
)

export const bootstrapRootScope = (): void => {
	// ensure the scope is resolved so JIT will be applied to future types
	rootSchemaScope.export()
}

export const parseAsSchema = (
	def: unknown,
	opts?: BaseParseOptions
): BaseRoot | ParseError => {
	try {
		return rootSchema(def as RootSchema, opts) as never
	} catch (e) {
		if (e instanceof ParseError) return e
		throw e
	}
}

export type RootExportCache = Record<
	string,
	BaseRoot | GenericRoot | RootModule | undefined
>

const resolutionsOfModule = ($: BaseScope, typeSet: RootExportCache) => {
	const result: InternalResolutions = {}
	for (const k in typeSet) {
		const v = typeSet[k]
		if (hasArkKind(v, "module")) {
			const innerResolutions = resolutionsOfModule($, v as never)
			const prefixedResolutions = flatMorph(
				innerResolutions,
				(innerK, innerV) => [`${k}.${innerK}`, innerV]
			)
			Object.assign(result, prefixedResolutions)
		} else if (hasArkKind(v, "root") || hasArkKind(v, "generic")) result[k] = v
		else throwInternalError(`Unexpected scope resolution ${printable(v)}`)
	}
	return result
}

export const writeUnresolvableMessage = <token extends string>(
	token: token
): writeUnresolvableMessage<token> => `'${token}' is unresolvable`

export type writeUnresolvableMessage<token extends string> =
	`'${token}' is unresolvable`

export const writeNonSubmoduleDotMessage = <name extends string>(
	name: name
): writeNonSubmoduleDotMessage<name> =>
	`'${name}' must reference a module to be accessed using dot syntax`

export type writeNonSubmoduleDotMessage<name extends string> =
	`'${name}' must reference a module to be accessed using dot syntax`

export const writeMissingSubmoduleAccessMessage = <name extends string>(
	name: name
): writeMissingSubmoduleAccessMessage<name> =>
	`Reference to submodule '${name}' must specify an alias`

export type writeMissingSubmoduleAccessMessage<name extends string> =
	`Reference to submodule '${name}' must specify an alias`

export const rootSchema: BaseScope["schema"] = rootSchemaScope.schema
export const node: BaseScope["node"] = rootSchemaScope.node
export const defineSchema: BaseScope["defineSchema"] =
	rootSchemaScope.defineSchema
export const genericNode: BaseScope["generic"] = rootSchemaScope.generic
