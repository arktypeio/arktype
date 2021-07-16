#!/usr/bin/env node
try {
    import("./dist/mjs/runTypescript.js")
} catch {
    require("./dist/cjs/runTypescript")
}
