import { cleanup, setup } from "@arktype/attest"
// @ts-expect-error do not have context on why we have this here
import { afterAll, beforeAll } from "bun:test"

beforeAll(setup)
afterAll(cleanup)
