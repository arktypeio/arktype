import {
	Callable,
	cached,
	flatMorph,
	isThunk,
	type array,
	type thunkable
} from "@arktype/util"
import type { inferRoot } from "./inference.js"
import type { RootSchema } from "./kinds.js"
import type { BaseRoot, Root } from "./roots/root.js"
import type { RawRootScope, RootScope } from "./scope.js"
import { arkKind } from "./shared/utils.js"

export type GenericConstraintsTypes<
	params extends array<string> = array<string>
> = [...{ [i in keyof params]: unknown }]

export type GenericNodeSignature<
	params extends array<string>,
	constraints extends GenericConstraintsTypes<params>,
	def,
	$
> = <args extends instantiateGenericConstraintTypes<constraints>>(
	...args: args
) => Root<inferRoot<def, $ & bindGenericNodeInstantiation<params, $, args>>>

type instantiateGenericConstraintTypes<
	constraints extends GenericConstraintsTypes
> = { [i in keyof constraints]: Root<constraints[i]> }

export type bindGenericNodeInstantiation<
	params extends array<string>,
	$,
	args
> = {
	[i in keyof params & `${number}` as params[i]]: inferRoot<
		args[i & keyof args],
		$
	>
}

// Comparing to Generic directly doesn't work well, so we compare to only its props
export interface GenericProps<
	params extends array<string> = array<string>,
	constraints extends
		GenericConstraintsTypes<params> = GenericConstraintsTypes<params>,
	def = any,
	$ = any
> {
	[arkKind]: "generic"
	params: params
	constraints: instantiateGenericConstraintTypes<constraints>
	def: def
	$: RootScope<$>
}

export type GenericArgResolutions<
	params extends array<string> = array<string>
> = Record<params[number], BaseRoot>

export type LazyGenericDef<params extends array<string> = array<string>> = (
	args: GenericArgResolutions<params>
) => RootSchema

export class LazyGenericRoot<
	params extends array<string> = array<string>
> extends Callable<LazyGenericDef<params>> {}

export class GenericRoot<
		params extends array<string> = array<string>,
		def = any,
		$ = any
	>
	extends Callable<GenericNodeSignature<params, def, $>>
	implements GenericProps
{
	readonly [arkKind] = "generic"

	constructor(
		public params: params,
		public def: def,
		private _$: thunkable<RootScope<$>>,
		private _arg$: thunkable<RootScope<$>>
	) {
		super((...args: RootSchema[]) => {
			const argNodes: GenericArgResolutions = flatMorph(params, (i, param) => [
				param,
				this.arg$.parseRoot(args[i])
			]) as never

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
	get baseConstraints(): array<RootSchema> {
		return this.params.map(_ => $ark.intrinsic.unknown)
	}

	@cached
	get baseInstantiation(): Root {
		return this(...(this.baseConstraints as never))
	}

	validateBaseInstantiation(): this {
		this.baseInstantiation
		return this as never
	}

	get internal(): this {
		return this
	}

	get references() {
		return this.baseInstantiation.internal.references
	}
}
