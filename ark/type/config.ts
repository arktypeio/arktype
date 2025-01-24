import type { ArkSchemaRegistry } from "@ark/schema"
import type { Ark } from "./keywords/keywords.ts"
import type { exportScope } from "./module.ts"

export { configure, type ArkConfig, type ArkSchemaRegistry } from "@ark/schema"

export interface ArkTypeRegistryContents extends ArkSchemaRegistry {
	ambient: exportScope<Ark>
}

declare global {
	export interface ArkEnv {
		$(): Ark
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
export declare namespace ArkAmbient {
	export type $ = ReturnType<ArkEnv["$"]>

	export type meta = ArkEnv.meta

	export type prototypes = ArkEnv.prototypes
}
