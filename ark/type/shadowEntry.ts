// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { shareConfig } from "@ark/schema/runtime"
import { noSuggest } from "@ark/util"
import { configure } from "./config.ts"

// a shadowed module imports this before arktype, so claimEntry lets arktype and the runtime load in either order
;(globalThis as Record<string, unknown>)[noSuggest("loadedArktypeEntry")] =
	"both"
shareConfig(configure)
