import {
	Callable,
	Hkt,
	ancestorsOf,
	cached,
	flatMorph,
	throwParseError,
	type array
} from "@ark/util"
import type { inferRoot } from "./inference.js"
import type { Root, UnknownRoot } from "./roots/root.js"
import type { RawRootScope, RootScope } from "./scope.js"
import { arkKind } from "./shared/utils.js"

export type GenericParamAst<
	name extends string = string,
	constraint = unknown
> = [name: name, constraint: constraint]

export namespace GenericParamAst {
	export type Any = GenericParamAst<string, any>
}

export type GenericParamDef<name extends string = string> =
	| name
	| ConstrainedGenericParamDef

export type ConstrainedGenericParamDef<name extends string = string> =
	GenericParamAst<name>

export const parseGeneric = (
	paramDefs: array<GenericParamDef>,
	bodyDef: unknown,
	$: RootScope
): GenericRoot => new GenericRoot(paramDefs, bodyDef, $, $)

type genericParamSchemaToAst<schema extends GenericParamDef, $> =
	schema extends string ? GenericParamAst<schema>
	: schema extends ConstrainedGenericParamDef ?
		GenericParamAst<schema[0], inferRoot<schema[1], $>>
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

export type GenericNodeSignature<
	params extends array<GenericParamAst>,
	def,
	$
> = <args extends instantiateConstraintsOf<params>>(
	...args: args
) => Root<inferRoot<def, $ & bindGenericNodeInstantiation<params, $, args>>>

type instantiateConstraintsOf<params extends array<GenericParamAst>> = {
	[i in keyof params]: Root<params[i][1]>
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
	$: RootScope<$>
}

export type GenericArgResolutions<
	params extends array<GenericParamAst> = array<GenericParamAst>
> = {
	[i in keyof params as params[i & `${number}`][0]]: UnknownRoot<
		params[i & `${number}`][1]
	>
}

export type GenericInstantiator<
	params extends array<GenericParamAst> = array<GenericParamAst>,
	returns = unknown
> = (args: GenericArgResolutions<params>) => returns

export class GenericHkt<
	params extends array<GenericParamAst> = any
> extends Callable<GenericInstantiator<params>> {
	static readonly [arkKind] = "hkt"

	declare readonly [Hkt.args]: unknown
	declare readonly hkt: Hkt.Kind["hkt"]
}

export type GenericHktSubclass<params extends array<GenericParamAst> = any> =
	new () => GenericHkt<params>

export const isGenericHkt = (v: unknown): v is GenericHktSubclass =>
	typeof v === "function" && ancestorsOf(v.prototype).includes(GenericHkt)

export class GenericRoot<
	params extends array<GenericParamAst> = array<GenericParamAst>,
	bodyDef = unknown,
	$ = {},
	arg$ = $
> extends Callable<GenericNodeSignature<params, bodyDef, $>> {
	readonly [arkKind] = "generic"
	declare readonly paramsAst: params

	constructor(
		public paramDefs: genericParamAstToDefs<params>,
		public bodyDef: bodyDef,
		public $: RootScope<$>,
		public arg$: RootScope<arg$>
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
			}) as GenericArgResolutions

			if (isGenericHkt(bodyDef)) {
				const def = new bodyDef()(argNodes as never)

				return this.$.parseRoot(def) as never
			}

			return this.$.parseRoot(bodyDef, { args: argNodes }) as never
		})

		this.validateBaseInstantiation()
	}

	bindScope($: RawRootScope): this {
		if (this.arg$ === ($ as never)) return this
		return new GenericRoot(
			this.params as never,
			this.bodyDef,
			this.$,
			$ as never
		) as never
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
	get baseInstantiation(): Root {
		return this(...(this.constraints as never))
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
