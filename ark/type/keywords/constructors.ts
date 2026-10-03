import {
	ecmascriptConstructors,
	platformConstructors,
	type EcmascriptObjects,
	type KeySet,
	type PlatformObjects
} from "@ark/util"
import type { Module, Submodule } from "../module.ts"
import { keywordModule } from "../scope.ts"
import { arkArray } from "./Array.ts"
import { arkFormData } from "./FormData.ts"
import { TypedArray } from "./TypedArray.ts"

const omittedPrototypes = {
	Boolean: 1,
	Number: 1,
	String: 1
} satisfies KeySet<keyof EcmascriptObjects>

const instanceOfDefinitions: Record<string, unknown> = {}

for (const constructors of [ecmascriptConstructors, platformConstructors]) {
	for (const k in constructors) {
		if (k in omittedPrototypes) continue
		instanceOfDefinitions[k] = () => [
			"instanceof",
			constructors[k as keyof typeof constructors]
		]
	}
}

export const prototypeDefinitions = {
	...instanceOfDefinitions,
	Array: arkArray,
	TypedArray,
	FormData: arkFormData
}

export const arkPrototypes: arkPrototypes.module = keywordModule(
	prototypeDefinitions
) as never

export declare namespace arkPrototypes {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export interface keywords extends ecmascript, platform {}

	interface $ extends Omit<keywords, keyof wrapped>, wrapped {}

	export interface wrapped {
		Array: arkArray.submodule
		TypedArray: TypedArray.submodule
		FormData: arkFormData.submodule
	}

	export type ecmascript = Omit<
		EcmascriptObjects,
		keyof typeof omittedPrototypes
	>

	export type platform = PlatformObjects

	export interface instances extends ecmascript, platform {}

	// avoid bad prototypes polluting inference:
	// https://github.com/arktypeio/arktype/issues/1399
	export type NonDegenerateName =
		keyof instances extends infer k ?
			k extends keyof instances ?
				{} extends instances[k] ?
					never
				:	k
			:	never
		:	never

	export type instanceOf<name extends NonDegenerateName = NonDegenerateName> =
		instances[name]
}
