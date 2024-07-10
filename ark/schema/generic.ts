import {
	Callable,
	cached,
	flatMorph,
	isThunk,
	type array,
	type conform,
	type repeat,
	type thunkable
} from "@arktype/util"
import type { inferRoot } from "./inference.js"
import type { RootSchema } from "./kinds.js"
import type { BaseRoot, Root } from "./roots/root.js"
import type { RawRootScope, RootScope } from "./scope.js"
import { arkKind } from "./shared/utils.js"

export type GenericNodeInstantiation<
	params extends string[] = string[],
	def = unknown,
	$ = any
> = <args>(
	...args: conform<args, repeat<[RootSchema], params["length"]>>
) => Root<inferRoot<def, $ & bindGenericNodeInstantiation<params, $, args>>>

export type bindGenericNodeInstantiation<params extends string[], $, args> = {
	[i in keyof params & `${number}` as params[i]]: inferRoot<
		args[i & keyof args],
		$
	>
}

// Comparing to Generic directly doesn't work well, so we compare to only its props
export interface GenericProps<
	params extends string[] = string[],
	def = any,
	$ = any
> {
	[arkKind]: "generic"
	params: params
	def: def
	$: RootScope<$>
}

export type GenericArgResolutions = Record<string, BaseRoot>

export class GenericRoot<params extends string[] = string[], def = any, $ = any>
	extends Callable<GenericNodeInstantiation<params, def, $>>
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
