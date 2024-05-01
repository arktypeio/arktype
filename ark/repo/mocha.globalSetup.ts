import { cleanup, setup } from "@arktype/attest"

process.env.TZ = "Etc/GMT" //"America/New_York"

export const mochaGlobalSetup = setup

export const mochaGlobalTeardown = cleanup
