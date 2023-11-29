import {
	isArray,
	printable,
	throwInternalError,
	throwParseError,
	transform,
	type Dict,
	type PartialRecord,
	type conform,
	type evaluate
} from "@arktype/util"
import { addArkKind } from "arktype/internal/type.js"
import type { Node, UnknownNode } from "./base.js"
import { maybeGetBasisKind } from "./bases/basis.js"
import type {
	instantiateAliases,
	instantiateSchemaBranches,
	validateAliases,
	validateSchemaBranch
} from "./inference.js"
import type { keywords, schema } from "./keywords/keywords.js"
import { parse, type SchemaParseOptions } from "./parse.js"
import type { KeyCheckKind } from "./refinements/props/shared.js"
import type { Schema } from "./schema.js"
import type { extractOut } from "./sets/morph.js"
import type { BranchKind } from "./sets/union.js"
import type { ProblemCode } from "./shared/compilation.js"
import type { NodeKind, SchemaKind } from "./shared/define.js"
import type {
	Definition,
	NormalizedDefinition,
	reducibleKindOf
} from "./shared/nodes.js"

export type nodeResolutions<keywords> = { [k in keyof keywords]: Schema }

export const globalResolutions: BaseResolutions = {}

export type BaseResolutions = Record<string, Schema>

export type StaticScope = {
	exports: BaseResolutions
	locals: BaseResolutions
	ambient: BaseResolutions
}

export type ModuleNode<resolutions extends BaseResolutions = BaseResolutions> =
	addArkKind<"moduleNode", resolutions>

export type ScopeParser<parent, ambient> = <const aliases>(
	aliases: validateAliases<aliases>
) => ScopeNode<{
	exports: instantiateAliases<aliases>
	locals: conform<parent, BaseResolutions>
	ambient: conform<ambient, BaseResolutions>
}>

export type ScopeOptions = {
	ambient?: ScopeNode
	codes?: Record<ProblemCode, { mustBe?: string }>
	keys?: KeyCheckKind
}

export class ScopeNode<s extends StaticScope = any> {
	declare infer: extractOut<s["exports"]>
	declare static keywords: typeof keywords
	declare static unknownUnion?: Schema<unknown, "union">
	readonly cls = ScopeNode
	// populated during initial schema parse
	private ambient: ScopeNode | undefined

	constructor(
		public def: Dict<string, unknown>,
		opts: ScopeOptions = {}
	) {
		this.ambient = opts.ambient
		// if (ScopeNode.root && !ScopeNode.unknownUnion) {
		// 	// ensure root has been set before parsing this to avoid a circularity
		// 	ScopeNode.unknownUnion = this.parsePrereduced("union", [
		// 		"string",
		// 		"number",
		// 		"object",
		// 		"bigint",
		// 		"symbol",
		// 		{ unit: true },
		// 		{ unit: false },
		// 		{ unit: null },
		// 		{ unit: undefined }
		// 	])
		// }
	}

	get builtin() {
		return ScopeNode.keywords
	}

	from: ScopeParser<s["exports"], s["ambient"]> = (aliases) =>
		new ScopeNode(aliases)

	toAmbient(): ScopeNode<{
		exports: s["exports"]
		locals: s["locals"]
		ambient: s["exports"]
	}> {
		// TODO: private?
		return new ScopeNode(this.def, {
			ambient: this
			// ...this.config
		})
	}

	static root: ScopeParser<{}, {}> = (aliases) => new ScopeNode(aliases)

	// import<names extends exportedName<r>[]>(
	// 	...names: names
	// ): destructuredImportContext<
	// 	r,
	// 	names extends [] ? keyof r["exports"] & string : names[number]
	// > {
	// 	return addArkKind(
	// 		transform(this.export(...names), (alias, value) => [
	// 			`#${alias as string}`,
	// 			value
	// 		]) as never,
	// 		"module"
	// 	) as never
	// }

	// TODO: submodules?
	private exportCache: ModuleNode<BaseResolutions> | undefined
	export<names extends (keyof s["exports"])[]>(
		...names: names
	): ModuleNode<
		names["length"] extends 0 ? s["exports"] : Pick<s["exports"], names[number]>
	>
	export(...names: string[]) {
		if (!this.exportCache) {
			this.exportCache = { [arkKind]: "module" }
			for (const k in this.def) {
				this.exportCache[k] = this.parseNode(
					schemaKindOf(this.def[k]),
					this.def[k] as never,
					{
						alias: k
					}
				)
			}
		}
		if (names.length === 0) {
			return this.exportCache
		}
		return addArkKind(
			transform(names, (_, name) => [name, this.exportCache![name]]) as never,
			"module"
		) as never
	}

	// private exportedResolutions: MergedResolutions | undefined
	// private exportCache: ExportCache | undefined
	// export<names extends exportedName<r>[]>(
	// 	...names: names
	// ): Module<
	// 	names extends [] ? r : destructuredExportContext<r, names[number]>
	// > {
	// 	if (!this.exportCache) {
	// 		this.exportCache = {}
	// 		for (const name of this.exportedNames) {
	// 			let def = this.aliases[name]
	// 			if (hasArkKind(def, "generic")) {
	// 				this.exportCache[name] = def
	// 				continue
	// 			}
	// 			// TODO: thunk generics?
	// 			// handle generics before invoking thunks, since they use
	// 			// varargs they will incorrectly be considered thunks
	// 			if (isThunk(def)) {
	// 				def = def()
	// 			}
	// 			if (hasArkKind(def, "module")) {
	// 				this.exportCache[name] = def
	// 			} else {
	// 				this.exportCache[name] = new Type(this.maybeResolve(name), this)
	// 			}
	// 		}
	// 		this.exportedResolutions = resolutionsOfModule(this.exportCache)
	// 		Object.assign(this.resolutions, this.exportedResolutions)
	// 	}
	// 	const namesToExport = names.length ? names : this.exportedNames
	// 	return addArkKind(
	// 		transform(namesToExport, (_, name) => [
	// 			name,
	// 			this.exportCache![name]
	// 		]) as never,
	// 		"module"
	// 	) as never
	// }

	parseUnion<const branches extends readonly Definition<BranchKind>[]>(
		input: {
			branches: {
				[i in keyof branches]: validateSchemaBranch<branches[i], s>
			}
		} & NormalizedDefinition<"union">
	): instantiateSchemaBranches<branches> {
		return this.parseNode("union", input) as never
	}

	parseBranches<const branches extends readonly Definition<BranchKind>[]>(
		...branches: {
			[i in keyof branches]: validateSchemaBranch<branches[i], s>
		}
	): instantiateSchemaBranches<branches> {
		return this.parseNode("union", branches as never) as never
	}

	parseUnits<const branches extends readonly unknown[]>(
		...values: branches
	): branches["length"] extends 1
		? Schema<branches[0], "unit">
		: Schema<branches[number], "union" | "unit"> {
		const uniqueValues: unknown[] = []
		for (const value of values) {
			if (!uniqueValues.includes(value)) {
				uniqueValues.push(value)
			}
		}
		const branches = uniqueValues.map((unit) =>
			this.parsePrereduced("unit", { unit })
		)
		if (branches.length === 1) {
			return branches[0]
		}
		return this.parsePrereduced("union", {
			branches
		}) as never
	}

	parsePrereduced<kind extends SchemaKind>(
		kind: kind,
		def: Definition<kind>
	): Node<kind> {
		return this.parseNode(kind, def, {
			prereduced: true
		}) as never
	}

	parseSchemaFromKinds<defKind extends SchemaKind>(
		allowedKinds: readonly defKind[],
		def: Definition<defKind>
	): Node<reducibleKindOf<defKind>> {
		const kind = schemaKindOf(def)
		if (!allowedKinds.includes(kind as never)) {
			return throwParseError(
				`Schema of kind ${kind} should be one of ${allowedKinds}`
			)
		}
		return this.parseNode(kind, def as never) as never
	}

	private static typeCountsByPrefix: PartialRecord<string, number> = {}
	parseNode<kind extends NodeKind>(
		kind: kind,
		def: Definition<kind>,
		opts: SchemaParseOptions = {}
	): Node<reducibleKindOf<kind>> {
		const prefix = opts.alias ?? kind
		ScopeNode.typeCountsByPrefix[prefix] ??= 0
		const uuid = `${prefix}${++ScopeNode.typeCountsByPrefix[prefix]!}`
		if (opts.alias && opts.alias in this.keywords) {
			return throwInternalError(
				`Unexpected attempt to recreate existing alias ${opts.alias}`
			)
		}
		return parse(kind, def, {
			...opts,
			scope: this,
			definition: def,
			id: uuid
		}) as never
	}

	readonly schema = Object.assign(this.parseBranches.bind(this), {
		units: this.parseUnits.bind(this),
		union: this.parseUnion.bind(this),
		prereduced: this.parsePrereduced.bind(this)
	})
}

export const scopeNode = ScopeNode.from

export const rootSchema = ScopeNode.root.schema.bind(ScopeNode.root)

export const rootNode = ScopeNode.root.parseNode.bind(ScopeNode.root)

export const writeShallowCycleErrorMessage = (name: string, seen: string[]) =>
	`Alias '${name}' has a shallow resolution cycle: ${[...seen, name].join(":")}`

export const writeDuplicateNameMessage = <name extends string>(
	name: name
): writeDuplicateNameMessage<name> => `Duplicate name '${name}'`

type writeDuplicateNameMessage<name extends string> = `Duplicate name '${name}'`

const schemaKindOf = (input: unknown): SchemaKind => {
	const basisKind = maybeGetBasisKind(input)
	if (basisKind) {
		return basisKind
	}
	if (typeof input === "object" && input !== null) {
		if (isNode(input)) {
			if (input.isSchema()) {
				return input.kind
			}
			// otherwise, error at end of function
		} else if ("morph" in input) {
			return "morph"
		} else if ("branches" in input || isArray(input)) {
			return "union"
		} else {
			return "intersection"
		}
	}
	return throwParseError(`${printable(input)} is not a valid type schema`)
}
