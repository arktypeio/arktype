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

export type GenericParam<name extends string = string, constraint = unknown> =
	| name
	| ConstrainedGenericParam<name, constraint>

export type ConstrainedGenericParam<
	name extends string = string,
	constraint = unknown
> = readonly [name: name, constraint: constraint]

type schemaForParams<params extends array<GenericParam>> = {
	[i in keyof params]: params[i] extends string ? params[i]
	:	readonly [nameOf<params[i]>, constraintOf<params[i]>]
}

export type namesOf<params extends array<GenericParam>> = {
	[i in keyof params]: nameOf<params[i]>
}

type nameOf<param extends GenericParam> =
	param extends GenericParam<infer name> ? name : never

type constraintOf<param extends GenericParam> =
	param extends GenericParam<string, infer constraint> ? constraint : never

export type GenericNodeSignature<params extends array<GenericParam>, def, $> = <
	args extends instantiateConstraints<params>
>(
	...args: args
) => Root<inferRoot<def, $ & bindGenericNodeInstantiation<params, $, args>>>

type instantiateConstraints<params extends array<GenericParam>> = {
	[i in keyof params]: Root<constraintOf<params[i]>>
}

export type bindGenericNodeInstantiation<
	params extends array<GenericParam>,
	$,
	args
> = {
	[i in keyof params & `${number}` as nameOf<params[i]>]: inferRoot<
		args[i & keyof args],
		$
	>
}

// Comparing to Generic directly doesn't work well, so we compare to only its props
export interface GenericProps<
	params extends array<GenericParam> = array<GenericParam>,
	def = any,
	$ = any
> {
	[arkKind]: "generic"
	params: params
	def: def
	$: RootScope<$>
}

export type GenericArgResolutions<
	params extends array<GenericParam> = array<GenericParam>
> = Record<nameOf<params[number]>, BaseRoot>

export type LazyGenericDef<
	params extends array<GenericParam> = array<GenericParam>
> = (args: GenericArgResolutions<params>) => RootSchema

export class LazyGenericRoot<
	params extends array<GenericParam> = array<GenericParam>
> extends Callable<LazyGenericDef<params>> {}

export class GenericRoot<
		params extends array<GenericParam> = array<GenericParam>,
		def = any,
		$ = any
	>
	extends Callable<GenericNodeSignature<params, def, $>>
	implements GenericProps
{
	readonly [arkKind] = "generic"

	constructor(
		public params: schemaForParams<params>,
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
	get names(): { [i in keyof params]: nameOf<params[i]> } {
		return this.params.map(param =>
			typeof param === "string" ? param : param[0]
		) as never
	}

	@cached
	get constraints(): instantiateConstraints<params> {
		return this.params.map(param =>
			typeof param === "string" ?
				$ark.intrinsic.unknown
			:	this.$.parseRoot(param[1])
		) as never
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
