import arkenv from "arkenv"

export const env = arkenv({
	// Built-in validators
	DATABASE_HOST: "string.host",
	DATABASE_PORT: "number.port",

	// Optional variables with defaults
	LOG_LEVEL: "'debug' | 'info' | 'warn' | 'error' = 'info'",

	// Optional environment variable
	"API_KEY?": "string"
})
