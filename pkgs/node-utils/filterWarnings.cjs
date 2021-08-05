#!/usr/bin/env node
const { filterWarnings } = require("./dist/cjs/filterWarnings")

filterWarnings(["ExperimentalWarning"])
