import { cleanup, setup } from "@arktype/test"

// get around "not portable" error, can remove annotation if it doesn't error
export const mochaGlobalSetup: typeof setup = setup

export const mochaGlobalTeardown = cleanup
