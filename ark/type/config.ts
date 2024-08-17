import type { ArkSchemaRegistry } from "@ark/schema"
import type { Ark } from "./keywords/ark.ts"
import type { exportScope } from "./module.ts"

// eslint-disable-next-line @typescript-eslint/no-restricted-imports
export * from "@ark/schema/config"

export interface ArkTypeRegistryContents extends ArkSchemaRegistry {
	ambient: exportScope<Ark>
}

declare global {
	export interface ArkEnv {
		$(): Ark
	}

	export namespace ArkEnv {
		export type $ = ReturnType<ArkEnv["$"]>
	}
}

/**
 * This mirrors the global ArkEnv namespace as a local export. We use it instead
 * of the global internally due to a bug in twoslash that prevents `ark/docs`
 * from building if we refer to the global directly.
 *
 * If, in the future, docs can build while arktype refers to `ArkEnv.$` directly,
 * this can be removed.
 */
export namespace ArkAmbient {
	export type $ = ArkEnv.$

	export type meta = ArkEnv.meta

	export type prototypes = ArkEnv.prototypes
}
