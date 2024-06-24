import {
	Callable,
	cached,
	flatMorph,
	type array,
	type conform,
	type repeat
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
		public $: RootScope<$>
	) {
		super((...args: RootSchema[]) => {
			const argNodes: GenericArgResolutions = flatMorph(params, (i, param) => [
				param,
				$.schema(args[i])
			]) as never

			return $.schema(def as never, { args: argNodes }) as never
		})
	}

	bindScope($: RawRootScope): never {
		throw new Error(`Unimplemented generic bind ${$}`)
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
