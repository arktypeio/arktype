// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { shareConfig } from "@ark/schema/runtime"
import { configure } from "./config.ts"
// the program's configuration can choose errors "first" or "none"
import "./errors.ts"

// a standalone build imports this before arktype in each module with a runtime island
shareConfig(configure)
