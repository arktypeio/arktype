import {
	ecmascriptConstructors,
	flatMorph,
	platformConstructors,
	type EcmascriptObjects,
	type KeySet,
	type PlatformObjects
} from "@ark/util"
import type { Module, Submodule } from "../module.ts"
import { arkArray } from "./Array.ts"
import { arkFormData } from "./FormData.ts"
import { TypedArray } from "./TypedArray.ts"
import { arkModule } from "./utils.ts"

const omittedPrototypes = {
	Boolean: 1,
	Number: 1,
	String: 1
} satisfies KeySet<keyof EcmascriptObjects>

export const arkPrototypes: arkPrototypes.module = arkModule({
	...flatMorph(
		{ ...ecmascriptConstructors, ...platformConstructors },
		(k, v) => (k in omittedPrototypes ? [] : ([k, ["instanceof", v]] as const))
	),
	Array: arkArray,
	TypedArray,
	FormData: arkFormData
})

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

	export type instanceOf<name extends keyof instances = keyof instances> =
		instances[name]
}
