import type { Module, Scope } from "./scope.js"
import type { Generic, Type } from "./type.js"

declare global {
	export interface ArkKinds {
		type: Type
		scope: Scope
		generic: Generic
		module: Module
	}
}
