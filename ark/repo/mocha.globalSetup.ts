import { cleanup, setup } from "@ark/attest"

process.env.TZ = "America/New_York"

export const mochaGlobalSetup = setup

export const mochaGlobalTeardown = cleanup
