#!/usr/bin/env node
try {
    import("./dist/mjs/cli.js")
} catch {
    require("./dist/cjs/cli")
}
