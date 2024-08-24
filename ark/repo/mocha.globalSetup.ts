import { cleanup, setup } from "@ark/attest"

process.env.TZ = "America/New_York"

export const mochaGlobalSetup = (): typeof cleanup =>
	setup({
		typeToStringFormat: {
			useTabs: true
		}
	})

export const mochaGlobalTeardown = cleanup
