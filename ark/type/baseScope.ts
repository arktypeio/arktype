import {
	addArkKind,
	BaseType,
	extendConfig,
	globalConfig,
	hasArkKind,
	resolveConfig,
	type ArkConfig,
	type distillIn,
	type distillOut,
	type ResolvedArkConfig,
	type SchemaParseOptions,
	type TypeKind,
	type TypeNode,
	type UnknownNode
} from "@arktype/schema"
import {
	flatMorph,
	isThunk,
	throwParseError,
	type Dict,
	type Json
} from "@arktype/util"
import type { ambient, type } from "./ark.js"
import {
	parseGenericParams,
	type GenericDeclaration
} from "./parser/generic.js"
import {
	writeMissingSubmoduleAccessMessage,
	writeNonSubmoduleDotMessage,
	writeUnresolvableMessage
} from "./parser/string/shift/operand/unenclosed.js"
import type { Module } from "./scope.js"
import { Type, validateUninstantiatedGeneric, type Generic } from "./type.js"

export type Resolutions = {
	exports: unknown
	locals: unknown
}

export type rootResolutions<exports> = {
	exports: exports
	locals: {}
}

export type ParseContext = {
	baseName: string
	path: string[]
	$: Scope
	args: Record<string, TypeNode> | undefined
}

type MergedResolutions = Record<string, TypeNode | Generic>

type exportedName<r extends Resolutions> = keyof r["exports"] & string

export type ScopeInput = {
	exports: {}
	locals: {}
}

declare global {
	export interface ArkRegistry {
		ambient: Scope<rootResolutions<ambient>>
	}
}

export abstract class Scope<r extends Resolutions = any> {
	declare infer: distillOut<r["exports"]>
	declare inferIn: distillIn<r["exports"]>

	readonly config: ArkConfig
	readonly resolvedConfig: ResolvedArkConfig

	private parseCache: Record<string, TypeNode> = {}
	private resolutions: MergedResolutions = {}
	readonly nodeCache: { [innerId: string]: UnknownNode } = {}
	readonly referencesByName: { [name: string]: UnknownNode } = {}
	references: readonly UnknownNode[] = []
	json: Json = {}
	protected resolved = false

	/** The set of names defined at the root-level of the scope mapped to their
	 * corresponding definitions.**/
	aliases: Record<string, unknown> = {}
	exportedNames: exportedName<r>[] = []

	constructor(def: Dict, config?: ArkConfig) {
		this.config = extendConfig(globalConfig, config)
		this.resolvedConfig = resolveConfig(this.config)
		if ($ark.ambient) {
			// ensure exportedResolutions is populated
			$ark.ambient.export()
			this.resolutions = { ...$ark.ambient.exportedResolutions! }
		} else {
			this.resolutions = {}
		}
	}

	abstract parse(...args: any[]): unknown
	abstract type(...args: any[]): unknown
	abstract scope(...args: any[]): unknown
	abstract define(...args: any[]): unknown

	maybeResolve(name: string): TypeNode | Generic | undefined {
		const cached = this.resolutions[name]
		if (cached) {
			return cached
		}
		let def = this.aliases[name]
		if (!def) return this.maybeResolveSubalias(name)
		if (isThunk(def) && !hasArkKind(def, "generic")) {
			def = def()
		}
		// TODO: initialize here?
		const resolution = hasArkKind(def, "generic")
			? validateUninstantiatedGeneric(def)
			: hasArkKind(def, "module")
			? throwParseError(writeMissingSubmoduleAccessMessage(name))
			: this.parseTypeRoot(def, { baseName: name, args: {} })
		this.resolutions[name] = resolution
		return resolution
	}

	/** If name is a valid reference to a submodule alias, return its resolution  */
	private maybeResolveSubalias(name: string): TypeNode | Generic | undefined {
		const dotIndex = name.indexOf(".")
		if (dotIndex === -1) {
			return
		}
		const dotPrefix = name.slice(0, dotIndex)
		const prefixDef = this.aliases[dotPrefix]
		if (hasArkKind(prefixDef, "module")) {
			const resolution = prefixDef[name.slice(dotIndex + 1)]?.root
			// if the first part of name is a submodule but the suffix is
			// unresolvable, we can throw immediately
			if (!resolution) {
				return throwParseError(writeUnresolvableMessage(name))
			}
			this.resolutions[name] = resolution
			return resolution
		}
		if (prefixDef !== undefined) {
			return throwParseError(writeNonSubmoduleDotMessage(dotPrefix))
		}
		// if the name includes ".", but the prefix is not an alias, it
		// might be something like a decimal literal, so just fall through to return
	}

	maybeResolveNode(name: string): TypeNode | undefined {
		const result = this.maybeResolve(name)
		return result instanceof BaseType ? (result as never) : undefined
	}

	import<names extends exportedName<r>[]>(
		...names: names
	): destructuredImportContext<
		r,
		names extends [] ? keyof r["exports"] & string : names[number]
	> {
		return addArkKind(
			flatMorph(this.export(...names) as Dict, (alias, value) => [
				`#${alias}`,
				value
			]) as never,
			"module"
		) as never
	}

	protected exportedResolutions: MergedResolutions | undefined
	protected exportCache: ExportCache | undefined
	export<names extends exportedName<r>[]>(
		...names: names
	): Module<
		names extends [] ? r : destructuredExportContext<r, names[number]>
	> {
		if (!this.exportCache) {
			this.exportCache = {}
			for (const name of this.exportedNames) {
				let def = this.aliases[name]
				if (hasArkKind(def, "generic")) {
					this.exportCache[name] = def
					continue
				}
				// TODO: thunk generics?
				// handle generics before invoking thunks, since they use
				// varargs they will incorrectly be considered thunks
				if (isThunk(def)) {
					def = def()
				}
				if (hasArkKind(def, "module")) {
					this.exportCache[name] = def
				} else {
					this.exportCache[name] = new Type(
						this.parseTypeRoot(def, {
							baseName: name,
							args: {}
						}),
						this
					)
				}
			}
			this.exportedResolutions = resolutionsOfModule(this.exportCache)
			// TODO: add generic json
			this.json = flatMorph(this.exportedResolutions, (k, v) =>
				hasArkKind(v, "node") ? [k, v.json] : []
			)
			Object.assign(this.resolutions, this.exportedResolutions)
			this.references = Object.values(this.referencesByName)
			// this.bindCompiledScope(this.references)
			this.resolved = true
		}
		const namesToExport = names.length ? names : this.exportedNames
		return addArkKind(
			flatMorph(namesToExport, (_, name) => [
				name,
				this.exportCache![name]
			]) as never,
			"module"
		) as never
	}
}

type ExportCache = Record<string, Type | Generic | Module>

const resolutionsOfModule = (typeSet: ExportCache) => {
	const result: MergedResolutions = {}
	for (const k in typeSet) {
		const v = typeSet[k]
		if (hasArkKind(v, "module")) {
			const innerResolutions = resolutionsOfModule(v as never)
			const prefixedResolutions = flatMorph(
				innerResolutions,
				(innerK, innerV) => [`${k}.${innerK}`, innerV]
			)
			Object.assign(result, prefixedResolutions)
		} else if (hasArkKind(v, "generic")) {
			result[k] = v
		} else {
			result[k] = v.root
		}
	}
	return result
}

type destructuredExportContext<
	r extends Resolutions,
	name extends exportedName<r>
> = {
	exports: { [k in name]: r["exports"][k] }
	locals: r["locals"] & {
		[k in Exclude<keyof r["exports"], name>]: r["exports"][k]
	}
	ambient: r["ambient"]
}

type destructuredImportContext<
	r extends Resolutions,
	name extends exportedName<r>
> = {
	[k in name as `#${k & string}`]: type.cast<r["exports"][k]>
}

export const writeShallowCycleErrorMessage = (
	name: string,
	seen: string[]
): string =>
	`Alias '${name}' has a shallow resolution cycle: ${[...seen, name].join(":")}`

export const writeDuplicateNameMessage = <name extends string>(
	name: name
): writeDuplicateNameMessage<name> => `Duplicate name '${name}'`

type writeDuplicateNameMessage<name extends string> = `Duplicate name '${name}'`

export type ParsedScopeKey = {
	isLocal: boolean
	name: string
	params: string[]
}

export const parseScopeKey = (k: string): ParsedScopeKey => {
	const isLocal = k[0] === "#"
	const name = isLocal ? k.slice(1) : k
	const firstParamIndex = k.indexOf("<")
	if (firstParamIndex === -1) {
		return {
			isLocal,
			name,
			params: []
		}
	}
	if (k.at(-1) !== ">") {
		throwParseError(
			`'>' must be the last character of a generic declaration in a scope`
		)
	}
	return {
		isLocal,
		name: name.slice(0, firstParamIndex),
		params: parseGenericParams(k.slice(firstParamIndex + 1, -1))
	}
}

type parseScopeKey<k> = k extends PrivateDeclaration<infer inner>
	? parsePossibleGenericDeclaration<inner, true>
	: parsePossibleGenericDeclaration<k, false>

type parsePossibleGenericDeclaration<
	k,
	isLocal extends boolean
> = k extends GenericDeclaration<infer name, infer paramString>
	? {
			isLocal: isLocal
			name: name
			params: parseGenericParams<paramString>
	  }
	: {
			isLocal: isLocal
			name: k
			params: []
	  }

export interface TypeSchemaParseOptions<allowedKind extends TypeKind = TypeKind>
	extends SchemaParseOptions {
	root?: boolean
	allowedKinds?: readonly allowedKind[]
}
