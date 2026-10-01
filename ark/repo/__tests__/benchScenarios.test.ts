import { contextualize } from "@ark/attest"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { check } from "../bench/scenarios.ts"

contextualize(() => {
	it("every library validates each bench scenario alike", () => check())
})
