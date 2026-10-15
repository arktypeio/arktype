// what a build whose errors say only that data is invalid resolves @ark/schema/runtime to, which the published package bundles with issuesNone.ts in place of issues.ts
export * from "./runtime.ts"
// so an assertion throws as the published package's does where arktype's source is read without that bundle
export { throwOnDefault } from "./shared/issuesNone.ts"
