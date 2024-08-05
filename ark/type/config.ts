import type { ArkSchemaRegistry } from "@ark/schema"
import type { Ark } from "./ark.js"
import type { exportScope } from "./module.js"

// eslint-disable-next-line @typescript-eslint/no-restricted-imports
export * from "@ark/schema/config"

export interface ArkTypeRegistryContents extends ArkSchemaRegistry {
	ambient: exportScope<Ark>
}

declare global {
	export interface ArkEnv {
		// $(): Ark
		registry(): ArkTypeRegistryContents
	}

	export namespace ArkEnv {
		// export type $ = ReturnType<ArkEnv["$"]>
	}
}
