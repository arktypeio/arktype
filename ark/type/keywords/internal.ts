import type { Module, Scope, rootResolutions } from "../scope.js"
import { root } from "./root.js"

export namespace internalPrimitive {
	export interface exports {
		lengthBoundable: string | unknown[]
		propertyKey: string | symbol
	}

	export type resolutions = rootResolutions<exports>

	export type infer = (typeof internalPrimitive)["infer"]
}

export const internalPrimitive: Scope<internalPrimitive.resolutions> =
	root.scope(
		{
			lengthBoundable: root.schema(["string", Array]),
			propertyKey: root.schema(["string", "symbol"])
		},
		{
			prereducedAliases: true,
			registerKeywords: true
		}
	)

export const internalPrimitiveKeywords: Module<internalPrimitive.resolutions> =
	internalPrimitive.export()
