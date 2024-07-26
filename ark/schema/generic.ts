import {
	$ark,
	cached,
	Callable,
	flatMorph,
	snapshot,
	throwParseError,
	type array,
	type Json
} from "@ark/util"
import type { inferRoot } from "./inference.js"
import type { SchemaRoot, UnknownRoot } from "./roots/root.js"
import type { BaseScope, InternalBaseScope } from "./scope.js"
import { arkKind } from "./shared/utils.js"

export type GenericParamAst<
	name extends string = string,
	constraint = unknown
> = [name: name, constraint: constraint]

export type GenericParamDef<name extends string = string> =
	| name
	| ConstrainedGenericParamDef

export type ConstrainedGenericParamDef<name extends string = string> =
	GenericParamAst<name>

export const parseGeneric = (
	paramDefs: array<GenericParamDef>,
	bodyDef: unknown,
	$: BaseScope
): GenericRoot => new GenericRoot(paramDefs, bodyDef, $, $)

type genericParamSchemaToAst<schema extends GenericParamDef, $> =
	schema extends string ? GenericParamAst<schema>
	: schema extends ConstrainedGenericParamDef ?
		[schema[0], inferRoot<schema[1], $>]
	:	never

export type genericParamSchemasToAst<
	schemas extends array<GenericParamDef>,
	$
> = [...{ [i in keyof schemas]: genericParamSchemaToAst<schemas[i], $> }]

export type genericParamAstToDefs<asts extends array<GenericParamAst>> = {
	[i in keyof asts]: GenericParamDef<asts[i][0]>
}

export type genericParamNames<params extends array<GenericParamAst>> = {
	[i in keyof params]: params[i][0]
}

export type genericParamConstraints<params extends array<GenericParamAst>> = {
	[i in keyof params]: params[i][1]
}

type instantiateParams<params extends array<GenericParamAst>> = {
	[i in keyof params]: params[i] extends (
		GenericParamAst<infer name, infer constraint>
	) ?
		GenericParam<name, constraint>
	:	never
}

export type GenericRootInstantiator<
	params extends array<GenericParamAst>,
	def,
	$
> = <args extends instantiateConstraintsOf<params>>(
	...args: args
) => SchemaRoot<
	inferRoot<def, $ & bindGenericNodeInstantiation<params, $, args>>
>

type instantiateConstraintsOf<params extends array<GenericParamAst>> = {
	[i in keyof params]: SchemaRoot<params[i][1]>
}

export type GenericParam<
	name extends string = string,
	constraint = unknown
> = readonly [name: name, constraint: UnknownRoot<constraint>]

export type bindGenericNodeInstantiation<
	params extends array<GenericParamAst>,
	$,
	args
> = {
	[i in keyof params & `${number}` as params[i][0]]: inferRoot<
		args[i & keyof args],
		$
	>
}

// Comparing to Generic directly doesn't work well, so we compare to only its props
export interface GenericProps<
	params extends array<GenericParamAst> = array<GenericParamAst>,
	bodyDef = any,
	$ = any
> {
	[arkKind]: "generic"
	paramsAst: params
	params: instantiateParams<params>
	names: genericParamNames<params>
	constraints: instantiateConstraintsOf<params>
	bodyDef: bodyDef
	$: BaseScope<$>
}

export type GenericArgResolutions<
	params extends array<GenericParamAst> = array<GenericParamAst>
> = {
	[i in keyof params as params[i & `${number}`][0]]: SchemaRoot<
		params[i & `${number}`][1]
	>
}

export class LazyGenericBody<
	argResolutions = {},
	returns = unknown
> extends Callable<(args: argResolutions) => returns> {}

export class GenericRoot<
	params extends array<GenericParamAst> = array<GenericParamAst>,
	bodyDef = unknown,
	$ = {},
	arg$ = $
> extends Callable<GenericRootInstantiator<params, bodyDef, $>> {
	readonly [arkKind] = "generic"
	declare readonly paramsAst: params

	constructor(
		public paramDefs: genericParamAstToDefs<params>,
		public bodyDef: bodyDef,
		public $: BaseScope<$>,
		public arg$: BaseScope<arg$>
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

				return this.$.parseRoot(def) as never
			}

			return this.$.parseRoot(bodyDef, { args: argNodes }) as never
		})

		this.validateBaseInstantiation()
	}

	defIsLazy(): this is GenericRoot<params, LazyGenericBody, $, arg$> {
		return this.bodyDef instanceof LazyGenericBody
	}

	bindScope($: InternalBaseScope): this {
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
	get params(): instantiateParams<params> {
		return this.paramDefs.map(
			(param): GenericParam =>
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
	get constraints(): instantiateConstraintsOf<params> {
		return this.params.map(e => e[1]) as never
	}

	@cached
	get baseInstantiation(): SchemaRoot {
		return this(...(this.constraints as never)) as never
	}

	validateBaseInstantiation(): this {
		this.baseInstantiation
		return this
	}

	get internal(): this {
		return this
	}

	get references() {
		return this.baseInstantiation.internal.references
	}
}

export type GenericHktSchemaParser<$ = {}> = <
	const paramsDef extends array<GenericParamDef>
>(
	...params: paramsDef
) => <
	hkt extends abstract new () => GenericHkt,
	params extends Array<GenericParamAst> = genericParamSchemasToAst<paramsDef, $>
>(
	instantiateDef: LazyGenericBody<GenericArgResolutions<params>>,
	hkt: hkt
) => GenericRoot<params, InstanceType<hkt>, $, $>

export abstract class GenericHkt<
	hkt extends (args: any) => unknown = (args: any) => unknown
> {
	declare readonly args: array
	abstract readonly hkt: hkt
}

export namespace GenericHkt {
	export type instantiate<
		hkt extends GenericHkt,
		args extends Parameters<hkt["hkt"]>[0]
	> = ReturnType<
		(hkt & {
			readonly args: args
		})["hkt"]
	>

	export type conform<thisArgs, parameters extends array> =
		thisArgs extends parameters ? thisArgs : parameters
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
