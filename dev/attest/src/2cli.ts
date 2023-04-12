#!/usr/bin/env node

import { Errors, flush, run } from "@oclif/core"
import { fromHere } from "./runtime/fs.ts"
run().then(flush).catch(Errors.handle)
