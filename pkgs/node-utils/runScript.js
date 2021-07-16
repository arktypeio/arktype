#!/usr/bin/env node
try {
    import("./dist/mjs/runScript.js")
} catch {
    require("./dist/cjs/runScript")
}
