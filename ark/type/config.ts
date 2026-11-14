import type { arkKind, TypeMeta } from "@ark/schema"
import type { Ark } from "./keywords/keywords.ts"
import type { Locale } from "./locale.ts"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import {
	configureSchema,
	type ArkSchemaConfig,
	type writeUnknownConfigOptionMessage
} from "@ark/schema/config"
import type { anyOrNever, ErrorMessage } from "@ark/util"

export type KeywordConfig = {
	[k in keyof Ark.flat as parseConfigurableFlatAlias<
		k,
		Ark.flat[k]
	>]?: TypeMeta.Collapsible
}

type parseConfigurableFlatAlias<k extends string, v> =
	[v] extends [anyOrNever] ? k
	: v extends { [arkKind]: "generic" | "module" } ? never
	: k extends `${infer prefix}.root` ? prefix
	: k

export interface ArkConfig extends ArkSchemaConfig {
	keywords?: KeywordConfig
	locale?: Locale | (() => Locale | undefined)
}

// inferred, so `typeof config.onFail` is what was passed. An option ArkConfig
// lacks is an error at its key, as it would be were the parameter ArkConfig
export const configure: <config extends ArkConfig>(
	config: validateConfig<config>
) => config = configureSchema as never

type validateConfig<config> = {
	[k in keyof config]: k extends keyof ArkConfig ? config[k]
	:	ErrorMessage<writeUnknownConfigOptionMessage<k & string>>
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
