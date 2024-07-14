import {
	Callable,
	cached,
	flatMorph,
	isThunk,
	throwParseError,
	type array,
	type thunkable
} from "@arktype/util"
import type { inferRoot } from "./inference.js"
import type { RootSchema } from "./kinds.js"
import type { Root, UnknownRoot } from "./roots/root.js"
import type { RawRootScope, RootScope } from "./scope.js"
import { arkKind } from "./shared/utils.js"

export type GenericParamAst<
	name extends string = string,
	constraint = unknown
> = readonly [name: name, constraint: constraint]

export type GenericParamDef<name extends string = string> =
	| name
	| ConstrainedGenericParamDef

export type ConstrainedGenericParamDef<name extends string = string> =
	GenericParamAst<name>

export const parseGeneric = (
	paramDefs: array<GenericParamDef>,
	bodyDef: unknown,
	$: thunkable<RootScope>
): GenericRoot => new GenericRoot(paramDefs, bodyDef, $, $)

type genericParamSchemaToAst<schema extends GenericParamDef, $> =
	schema extends string ? GenericParamAst<schema>
	: schema extends ConstrainedGenericParamDef ?
		GenericParamAst<schema[0], inferRoot<schema[1], $>>
	:	never

export type genericParamSchemasToAst<
	schemas extends array<GenericParamDef>,
	$
> = readonly [
	...{ [i in keyof schemas]: genericParamSchemaToAst<schemas[i], $> }
]

export type genericParamAstToDefs<asts extends array<GenericParamAst>> = {
	[i in keyof asts]: GenericParamDef<asts[i][0]>
}

export type genericParamNames<params extends array<GenericParamAst>> = {
	[i in keyof params]: params[i][0]
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

export type LazyGenericSchema<
	params extends array<GenericParamAst> = array<GenericParamAst>,
	returns extends RootSchema = RootSchema
> = (args: GenericArgResolutions<params>) => returns

export class LazyGenericRoot<
	params extends array<GenericParamAst> = array<GenericParamAst>
> extends Callable<LazyGenericSchema<params>> {}

export class GenericRoot<
		params extends array<GenericParamAst> = array<GenericParamAst>,
		bodyDef = any,
		$ = any
	>
	extends Callable<GenericNodeSignature<params, bodyDef, $>>
	implements GenericProps
{
	readonly [arkKind] = "generic"

	constructor(
		public paramDefs: genericParamAstToDefs<params>,
		public bodyDef: bodyDef,
		private _$: thunkable<RootScope<$>>,
		private _arg$: thunkable<RootScope<$>>
	) {
		super((...args: any[]) => {
			const argNodes = flatMorph(this.names, (i, name) => {
				const arg = this.arg$.parseRoot(args[i])
				if (!arg.extends(this.constraints[i])) throwParseError("FAIL")
				return [name, arg]
			}) as GenericArgResolutions

			if (bodyDef instanceof LazyGenericRoot)
				return this.$.parseRoot(bodyDef(argNodes)) as never

			return this.$.parseRoot(bodyDef as never, { args: argNodes }) as never
		})
		// if this is a standalone generic, validate its base constraints right away
		if (!isThunk(this._$)) this.validateBaseInstantiation()
		// if it's part of a scope, scope.export will be resposible for invoking
		// validateBaseInstantiation on export() once everything is resolvable
	}

	get $() {
		return isThunk(this._$) ? this._$() : this._$
	}

	get arg$() {
		return isThunk(this._arg$) ? this._arg$() : this._arg$
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
