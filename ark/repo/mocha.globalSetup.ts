import { cleanup, setup } from "@ark/attest"
// @ark/schema's own tests exercise the language with the algebra installed
import "arksets"

process.env.TZ = "America/New_York"

// what tests read of the processes they spawn and the bundlers they run
// shouldn't depend on whether the environment asks for color, as a CI runner's
// can
process.env.NO_COLOR = "1"
delete process.env.FORCE_COLOR

export const mochaGlobalSetup = (): typeof cleanup =>
	setup({
		typeToStringFormat: {
			useTabs: true
		}
	})

export const mochaGlobalTeardown = cleanup
