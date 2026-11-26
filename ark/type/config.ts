import type { ArkEnv, arkKind, TypeMeta } from "@ark/schema"
import type { Ark } from "./keywords/keywords.ts"
import type { Locale } from "./locale.ts"

import {
	configureSchema,
	type ArkSchemaConfig,
	type writeUnknownConfigOptionMessage
} from "@ark/schema/config"
import type { anyOrNever, ErrorMessage, noSuggest } from "@ark/util"

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

/** what strings resolve against: ArkEnv's $ if a program declares one, else Ark */
export declare namespace ArkAmbient {
	export type $ =
		unknown extends ReturnType<ArkEnv["$"]> ? Ark : ReturnType<ArkEnv["$"]>

	export type meta = ArkEnv.meta

	export type prototypes = ArkEnv.prototypes
}

export type AmbientKey = noSuggest<"ambient">

export type ambientOf<$> =
	[$] extends [{ readonly [k in AmbientKey]: infer a }] ? a : ArkAmbient.$
