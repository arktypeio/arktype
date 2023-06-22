import type { Scope } from "../scope.js"

/** Root scopes can be inferred automatically from node definitions, but
 * explicitly typing them can improve responsiveness */
export type RootScope<exports extends Record<string, unknown>> = Scope<{
    exports: exports
    locals: {}
    ambient: {}
}>
