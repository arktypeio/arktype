import {
	Callable,
	flatMorph,
	snapshot,
	throwParseError,
	type array,
	type Hkt,
	type JsonStructure
} from "@ark/util"
import type { RootSchema } from "./kinds.ts"
import type { BaseNode } from "./node.ts"
import type { BaseRoot } from "./roots/root.ts"
import type { BaseScope } from "./scope.ts"
import { $ark } from "./shared/registry.ts"
import { arkKind } from "./shared/utils.ts"

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
	$: BaseScope
): GenericRoot => new GenericRoot(paramDefs, bodyDef, $, $, null)

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
	baseInstantiation: BaseRoot
	hkt: Hkt.constructor | null
	description: string

	constructor(
		paramDefs: array<GenericParamDef>,
		bodyDef: bodyDef,
		$: BaseScope,
		arg$: BaseScope,
		hkt: Hkt.constructor | null
	) {
		super((...args: any[]) => {
			const argNodes = flatMorph(this.names, (i, name) => {
				const arg = this.arg$.parse(args[i])
				if (!arg.extends(this.constraints[i])) {
					throwParseError(
						writeUnsatisfiedParameterConstraintMessage(
							name,
							this.constraints[i].expression,
							arg.expression
						)
					)
				}
				return [name, arg]
			}) as GenericArgResolutions<any>

			if (this.defIsLazy()) {
				const def = this.bodyDef(argNodes)

				return this.$.parse(def)
			}

			return this.$.parse(bodyDef, { args: argNodes })
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
		this.baseInstantiation = this(...(this.constraints as any)) as never
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
					[param, $ark.intrinsic.unknown]
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
