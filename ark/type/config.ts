import type { ArkSchemaConfig, ArkSchemaRegistry } from "@ark/schema"
import type { Ark } from "./keywords/keywords.ts"
import type { exportScope } from "./module.ts"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
export { configure, type ArkSchemaRegistry } from "@ark/schema/config"

export interface ArkTypeRegistryContents extends ArkSchemaRegistry {
	ambient: exportScope<Ark>
}

export type KeywordConfig = { [k in keyof Ark.flat]?: ArkEnv.meta }

export interface ArkConfig extends ArkSchemaConfig {
	keywords?: KeywordConfig
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
