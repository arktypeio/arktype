import { cleanup, setup } from "@arktype/attest"
import { afterAll, beforeAll } from "bun:test"

beforeAll(() => setup({ preserveCache: true }))
afterAll(cleanup)
