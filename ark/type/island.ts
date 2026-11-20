import { shareConfig } from "arktype/schema/runtime"
import { configure } from "./config.ts"
// the program's configuration can choose errors "first" or "none" and mutatesInput
import "./errors.ts"
import "./mutatesInput.ts"

// a standalone build imports this before arktype in each module with a runtime island
shareConfig(configure)
