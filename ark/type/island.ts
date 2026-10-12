// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { shareConfig } from "@ark/schema/runtime"
import { configure } from "./config.ts"

// a standalone build imports this before arktype in each module with a runtime island
shareConfig(configure)
