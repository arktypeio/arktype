import {
	cached,
	Callable,
	flatMorph,
	snapshot,
	throwParseError,
	type array,
	type Hkt,
	type Json
} from "@ark/util"
import type { BaseNode } from "./node.js"
import type { BaseRoot } from "./roots/root.js"
import type { BaseScope } from "./scope.js"
import { arkKind } from "./shared/utils.js"

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
): GenericRoot => new GenericRoot(paramDefs, bodyDef, $, $)

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

	constructor(
		public paramDefs: array<GenericParamDef>,
		public bodyDef: bodyDef,
		public $: BaseScope,
		public arg$: BaseScope
	) {
		super((...args: any[]) => {
			const argNodes = flatMorph(this.names, (i, name) => {
				const arg = this.arg$.parseRoot(args[i])
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

				return this.$.parseRoot(def)
			}

			return this.$.parseRoot(bodyDef, { args: argNodes })
		})

		this.validateBaseInstantiation()
	}

	defIsLazy(): this is GenericRoot<params, LazyGenericBody> {
		return this.bodyDef instanceof LazyGenericBody
	}

	bindScope($: BaseScope): this {
		if (this.arg$ === ($ as never)) return this
		return new GenericRoot(
			this.params as never,
			this.bodyDef,
			this.$,
			$ as never
		) as never
	}

	@cached
	get json(): Json {
		return {
			params: this.params.map(param =>
				param[1].isUnknown() ? param[0] : [param[0], param[1].json]
			),
			body: snapshot(this.bodyDef) as never
		}
	}

	@cached
	get params(): { [i in keyof params]: [params[i][0], BaseRoot] } {
		return this.paramDefs.map(param =>
			typeof param === "string" ?
				[param, $ark.intrinsic.unknown]
			:	[param[0], this.$.parseRoot(param[1])]
		) as never
	}

	@cached
	get names(): genericParamNames<params> {
		return this.params.map(e => e[0]) as never
	}

	@cached
	get constraints(): { [i in keyof params]: BaseRoot } {
		return this.params.map(e => e[1]) as never
	}

	@cached
	get baseInstantiation(): BaseRoot {
		return this(...(this.constraints as never)) as never
	}

	validateBaseInstantiation(): this {
		this.baseInstantiation
		return this
	}

	get internal(): this {
		return this
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

export type GenericHktSchemaParser = <
	const paramsDef extends readonly GenericParamDef[]
>(
	...params: paramsDef
) => GenericHktSchemaBodyParser<genericParamSchemasToAst<paramsDef>>

export type GenericHktSchemaBodyParser<params extends array<GenericParamAst>> =
	<hkt extends Hkt.constructor>(
		instantiateDef: LazyGenericBody<GenericArgResolutions<params>>,
		hkt: hkt
	) => GenericRoot<
		{
			[i in keyof params]: [params[i][0], genericHktToConstraints<hkt>[i]]
		},
		InstanceType<hkt>
	>

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
