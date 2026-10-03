import {
	Callable,
	flatMorph,
	snapshot,
	throwParseError,
	type array,
	type Hkt,
	type JsonStructure
} from "@ark/util"
import { intrinsic } from "./intrinsic.ts"
import type { RootSchema } from "./kinds.ts"
import type { BaseNode } from "./node.ts"
import { registerNodeId, type NodeId } from "./parse.ts"
import {
	identityOf,
	isResolvable,
	resolveShallowAliases
} from "./roots/alias.ts"
import type { BaseRoot } from "./roots/root.ts"
import type { BaseScope } from "./scope.ts"
import { arkKind, inProgress } from "./shared/utils.ts"

export type GenericParamAst<
	name extends string = string,
	constraint = unknown
> = [name: name, constraint: constraint]

export type GenericParamDef<name extends string = string> =
	| name
	| readonly [name, unknown]

export const parseGeneric = (
	paramDefs: array<GenericParamDef>,
	bodyDef: unknown,
	$: BaseScope,
	alias?: string
): GenericRoot => new GenericRoot(paramDefs, bodyDef, $, $, null, alias)

export type genericParamNames<params extends array<GenericParamAst>> = {
	[i in keyof params]: params[i][0]
}

export type genericParamConstraints<params extends array<GenericParamAst>> = {
	[i in keyof params]: params[i][1]
}

export type GenericArgResolutions<
	params extends array<GenericParamAst> = array<GenericParamAst>
> = {
	[i in keyof params as params[i & `${number}`][0]]: BaseRoot
}

export class LazyGenericBody<
	argResolutions = {},
	returns = unknown
> extends Callable<(args: argResolutions) => returns> {}

export interface GenericAst<
	params extends array<GenericParamAst> = array<GenericParamAst>,
	bodyDef = unknown,
	$ = unknown,
	arg$ = $
> {
	[arkKind]: "generic"
	paramsAst: params
	bodyDef: bodyDef
	$: $
	arg$: arg$
	names: genericParamNames<params>
	t: this
}

export class GenericRoot<
	params extends array<GenericParamAst> = array<GenericParamAst>,
	bodyDef = unknown
> extends Callable<(...args: { [i in keyof params]: BaseRoot }) => BaseRoot> {
	readonly [arkKind] = "generic"
	declare readonly paramsAst: params
	declare readonly t: GenericAst<params, bodyDef, {}, {}>

	paramDefs: array<GenericParamDef>
	bodyDef: bodyDef
	$: BaseScope
	arg$: BaseScope
	hkt: Hkt.constructor | null
	description: string
	alias: string | undefined
	private instantiations: Record<string, BaseRoot | NodeId> = {}
	private openInstantiations = 0

	constructor(
		paramDefs: array<GenericParamDef>,
		bodyDef: bodyDef,
		$: BaseScope,
		arg$: BaseScope,
		hkt: Hkt.constructor | null,
		alias?: string
	) {
		super((...args: any[]) => {
			const argNodes = flatMorph(this.names, (i, name) => [
				name,
				this.arg$.parse(args[i])
			]) as GenericArgResolutions<any>
			const argList = this.names.map(name => argNodes[name])
			const key = argList.map(identityOf).join(",")
			if (
				argList.some(
					(arg, i) => !this.constraints[i].isUnknown() && !isResolvable(arg)
				)
			) {
				return this.arg$.lazilyResolve(
					() => this.instantiate(key, argNodes),
					`${this.id}<${key}>`,
					this.alias ?? "generic",
					argList
				)
			}
			return this.instantiate(key, argNodes)
		})

		this.paramDefs = paramDefs
		this.bodyDef = bodyDef
		this.$ = $
		this.arg$ = arg$
		this.hkt = hkt
		this.description =
			hkt ?
				(new hkt().description ?? `a generic type for ${hkt.constructor.name}`)
			:	"a generic type"
		this.alias = alias
		if ($.resolved || !alias) void this.baseInstantiation
	}

	get id(): NodeId {
		return this.cacheGetter("id", registerNodeId(this.alias ?? "generic"))
	}

	get baseInstantiation(): BaseRoot {
		return this.cacheGetter(
			"baseInstantiation",
			this(...(this.constraints as any)) as never
		)
	}

	private instantiate(
		key: string,
		argNodes: GenericArgResolutions<any>
	): BaseRoot {
		const instantiation = this.instantiations[key]
		if (typeof instantiation === "string") {
			return this.$.node(
				"alias",
				{ reference: instantiation },
				{ prereduced: true }
			)
		}
		if (instantiation) return instantiation
		for (let i = 0; i < this.names.length; i++) {
			const constraint = this.constraints[i]
			if (constraint.isUnknown()) continue
			const name = this.names[i]
			const arg = argNodes[name]
			argNodes[name] = resolveShallowAliases(arg)
			if (!argNodes[name].extends(constraint)) {
				throwParseError(
					writeUnsatisfiedParameterConstraintMessage(
						name,
						constraint.expression,
						arg.expression
					)
				)
			}
		}
		if (this.openInstantiations === maxOpenInstantiations) {
			throwParseError(
				writeUnclosedGenericCycleMessage(this.alias ?? this.description)
			)
		}
		const id = registerNodeId(this.alias ?? "generic")
		this.instantiations[key] = id
		this.openInstantiations++
		try {
			const node =
				this.defIsLazy() ?
					this.$.parse(this.bodyDef(argNodes))
				:	this.$.parse(this.bodyDef, { args: argNodes, id })
			if (inProgress.definitions && node.includesAlias)
				delete this.instantiations[key]
			else this.instantiations[key] = node
			return node
		} catch (e) {
			delete this.instantiations[key]
			throw e
		} finally {
			this.openInstantiations--
		}
	}

	defIsLazy(): this is GenericRoot<params, LazyGenericBody> {
		return this.bodyDef instanceof LazyGenericBody
	}

	protected cacheGetter<name extends keyof this>(
		name: name,
		value: this[name]
	): this[name] {
		Object.defineProperty(this, name, { value })
		return value
	}

	get json(): JsonStructure {
		return this.cacheGetter("json", {
			params: this.params.map(param =>
				param[1].isUnknown() ? param[0] : [param[0], param[1].json]
			),
			body: snapshot(this.bodyDef) as never
		})
	}

	get params(): { [i in keyof params]: [params[i][0], BaseRoot] } {
		return this.cacheGetter(
			"params",
			this.paramDefs.map(param =>
				typeof param === "string" ?
					// read through intrinsic, which bootstraps again once an engine is installed
					[param, intrinsic.unknown]
				:	[param[0], this.$.parse(param[1])]
			) as never
		)
	}

	get names(): genericParamNames<params> {
		return this.cacheGetter("names", this.params.map(e => e[0]) as never)
	}

	get constraints(): { [i in keyof params]: BaseRoot } {
		return this.cacheGetter("constraints", this.params.map(e => e[1]) as never)
	}

	get internal(): this {
		return this
	}

	get referencesById(): Record<string, BaseNode> {
		return this.baseInstantiation.internal.referencesById
	}

	get references(): BaseNode[] {
		return this.baseInstantiation.internal.references
	}
}

export type genericParamSchemasToAst<
	schemas extends readonly GenericParamDef[]
> = {
	[i in keyof schemas]: schemas[i] extends GenericParamDef<infer name> ?
		[name, unknown]
	:	never
}

export type genericHktToConstraints<hkt extends abstract new () => Hkt> =
	InstanceType<hkt>["constraints"]

export type GenericRootParser = <
	const paramsDef extends readonly GenericParamDef[]
>(
	...params: paramsDef
) => GenericRootBodyParser<genericParamSchemasToAst<paramsDef>>

export type GenericRootBodyParser<params extends array<GenericParamAst>> = {
	<const body>(body: RootSchema): GenericRoot<params, body>

	<hkt extends Hkt.constructor>(
		instantiateDef: LazyGenericBody<GenericArgResolutions<params>>,
		hkt: hkt
	): GenericRoot<
		{
			[i in keyof params]: [params[i][0], genericHktToConstraints<hkt>[i]]
		},
		InstanceType<hkt>
	>
}

const maxOpenInstantiations = 100

export const writeUnclosedGenericCycleMessage = (name: string): string =>
	`Instantiating ${name} recursed with new arguments more than ${maxOpenInstantiations} times`

export const writeUnsatisfiedParameterConstraintMessage = <
	name extends string,
	constraint extends string,
	arg extends string
>(
	name: name,
	constraint: constraint,
	arg: arg
): writeUnsatisfiedParameterConstraintMessage<name, constraint, arg> =>
	`${name} must be assignable to ${constraint} (was ${arg})`

export type writeUnsatisfiedParameterConstraintMessage<
	name extends string,
	constraint extends string,
	arg extends string
> = `${name} must be assignable to ${constraint} (was ${arg})`
