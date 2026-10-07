// attest's declarations are checked without skipLibCheck so types it exposes
// can't depend on a specific TypeScript version's compiler API
import { attest, bench, setup, type AttestConfig } from "@ark/attest"

export const config: AttestConfig = {
	compilerOptions: { strict: true, module: "NodeNext" }
}

export const teardown = setup(config)

bench("compat", () => attest<string>("compat").type.toString.snap("string"))
