import type { Ark } from "./keywords/keywords.js"

// eslint-disable-next-line @typescript-eslint/no-restricted-imports
export * from "@ark/schema/config"

declare global {
	export interface ArkEnv {
		$(): Ark
	}

	export namespace ArkEnv {
		export type $ = ReturnType<ArkEnv["$"]>
	}
}
