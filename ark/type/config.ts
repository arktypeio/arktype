import type { ArkSchemaRegistryContents } from "@ark/schema"
import type { Ark } from "./ark.js"
import type { Module } from "./module.js"

// eslint-disable-next-line @typescript-eslint/no-restricted-imports
export * from "@ark/schema/config"

export interface ArkTypeRegistryContents extends ArkSchemaRegistryContents {
	ambient: Module<Ark>
}

declare global {
	export interface ArkEnv {
		$(): Ark
		registry(): ArkTypeRegistryContents
	}

	export namespace ArkEnv {
		export type $ = ReturnType<ArkEnv["$"]>
	}
}
