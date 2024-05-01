import { cleanup, setup } from "@arktype/attest"

process.env.TZ = "America/New_York"

export const mochaGlobalSetup = setup

export const mochaGlobalTeardown = cleanup
