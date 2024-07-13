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
import type { BaseRoot, Root } from "./roots/root.js"
import type { RawRootScope, RootScope } from "./scope.js"
import { arkKind } from "./shared/utils.js"

export type GenericParamAst<
	name extends string = string,
	constraint = unknown
> = readonly [name: name, constraint: constraint]

export type GenericParamSchema = string | ConstrainedGenericParamSchema

export type ConstrainedGenericParamSchema = GenericParamAst<string, RootSchema>

type genericParamSchemaToAst<schema extends GenericParamSchema, $> =
	schema extends string ? GenericParamAst<schema>
	: schema extends ConstrainedGenericParamSchema ?
		GenericParamAst<schema[0], inferRoot<schema[1], $>>
	:	never

export type genericParamSchemasToAst<
	schemas extends array<GenericParamSchema>,
	$
> = { [i in keyof schemas]: genericParamSchemaToAst<schemas[i], $> }

export type namesOf<params extends array<GenericParamAst>> = {
	[i in keyof params]: params[i][0]
}

type instantiateParams<params extends array<GenericParamAst>> = {
	[i in keyof params]: params[i] extends (
		GenericParamAst<infer name, infer constraint>
	) ?
		GenericParamAst<name, Root<constraint>>
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
	def = any,
	$ = any
> {
	[arkKind]: "generic"
	params: params
	names: namesOf<params>
	constraints: instantiateConstraintsOf<params>
	def: def
	$: RootScope<$>
}

export type GenericArgResolutions<
	params extends array<GenericParamAst> = array<GenericParamAst>
> = Record<params[number][0], BaseRoot>

export type LazyGenericDef<
	params extends array<GenericParamAst> = array<GenericParamAst>
> = (args: GenericArgResolutions<params>) => RootSchema

export class LazyGenericRoot<
	params extends array<GenericParamAst> = array<GenericParamAst>
> extends Callable<LazyGenericDef<params>> {}

export class GenericRoot<
		params extends array<GenericParamAst> = array<GenericParamAst>,
		def = any,
		$ = any
	>
	extends Callable<GenericNodeSignature<params, def, $>>
	implements GenericProps
{
	readonly [arkKind] = "generic"

	constructor(
		public params: instantiateParams<params>,
		public def: def,
		private _$: thunkable<RootScope<$>>,
		private _arg$: thunkable<RootScope<$>>
	) {
		super((...args: any[]) => {
			const argNodes = flatMorph(this.names, (i, name) => {
				const arg = this.arg$.parseRoot(args[i])
				if (!arg.extends(this.constraints[i])) throwParseError("FAIL")
				return [name, arg]
			}) as GenericArgResolutions

			if (def instanceof LazyGenericRoot)
				return this.$.parseRoot(def(argNodes)) as never

			return this.$.parseRoot(def as never, { args: argNodes }) as never
		})
	}

	get $() {
		return isThunk(this._$) ? this._$() : this._$
	}

	get arg$() {
		return isThunk(this._arg$) ? this._arg$() : this._arg$
	}

	bindScope($: RawRootScope): this {
		if (this.arg$ === ($ as never)) return this
		return new GenericRoot(this.params, this.def, this.$, $ as never) as never
	}

	@cached
	get names(): namesOf<params> {
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
