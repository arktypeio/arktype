import { createEnv } from "@t3-oss/env-core"
import { type } from "arktype"

export const Port = type("string.numeric.parse")

export const env = createEnv({
	server: { PORT: Port, DATABASE_URL: type("string.url") },
	runtimeEnv: process.env
})
