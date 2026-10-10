import { configure } from "arktype/config"

configure({ onUndeclaredKey: process.argv.length > 99 ? "delete" : "reject" })
