import { encodePlaygroundCode } from "../playground/utils.ts"

/**
 * The default single-prompt migration: installs the official skill, migrates
 * Zod schemas to ArkType, and wires up @ark/aot so the project actually gets
 * the homepage's precompiled speed, size and startup numbers.
 */
export const migratePromptAot =
	"Run npx skills add arktypeio/arktype, then migrate this project from Zod to ArkType and precompile it with @ark/aot."

/** dynamic-only variant for projects that prefer no build step */
export const migratePromptDynamic =
	"Run npx skills add arktypeio/arktype, then migrate this project from Zod to ArkType."

export const skillCommand = "npx skills add arktypeio/arktype"

export const integrations: [name: string, href: string][] = [
	["TanStack", "/docs/integrations#tanstack"],
	["tRPC", "/docs/integrations#trpc"],
	["Hono", "/docs/integrations#hono"],
	["React Hook Form", "/docs/integrations#react-hook-form"],
	["Elysia", "/docs/integrations#elysia"],
	["oRPC", "/docs/integrations#orpc"],
	["Drizzle", "/docs/integrations#drizzle"],
	["AI SDK", "/docs/integrations#ai-sdk"],
	["MCP SDK", "/docs/integrations#mcp-sdk"],
	["T3 Env", "/docs/integrations#t3-env"]
]

// playground/execute.ts evaluates the bindings `Thing` and `out`
const heroPlaygroundCode = `import { type } from "arktype"

const Thing = type({
	name: "string",
	email: "string.email",
	"age?": "number.integer >= 0",
	role: "'admin' | 'member'"
})

const out = Thing({
	name: "Ada",
	email: "ada@",
	age: -1,
	role: "admin"
})
`

/** deep link to /playground preloaded with the homepage's User example */
export const userPlaygroundHref = `/playground?${new URLSearchParams({
	code: encodePlaygroundCode(heroPlaygroundCode)
}).toString()}`
