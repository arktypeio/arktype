import { stripTypeScriptTypes } from "node:module"

// as a project's swc or ts loader, which webpack needs to read a .ts module
export default (source: string): string => stripTypeScriptTypes(source)
