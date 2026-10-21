// @ark/schema/runtime under errors "none" where errors lack methods,
// published with issuesNoneLean.ts
export * from "./runtime.ts"
// issuesNoneLean's throwOnDefault, as the published bundle has it
export { throwOnDefault } from "./shared/issuesNoneLean.ts"
