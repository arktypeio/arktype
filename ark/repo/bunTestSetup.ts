import { cleanup, setup } from "@arktype/attest"
// @ts-expect-error
import { afterAll, beforeAll } from "bun:test"

beforeAll(setup)
afterAll(cleanup)
