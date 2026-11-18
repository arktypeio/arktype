import { cleanup, setup } from "@ark/attest"
// @ark/schema's own tests exercise the language with the algebra installed
import "arksets"

process.env.TZ = "America/New_York"

export const mochaGlobalSetup = (): typeof cleanup =>
	setup({
		typeToStringFormat: {
			useTabs: true
		}
	})

export const mochaGlobalTeardown = cleanup
