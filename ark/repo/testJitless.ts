// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { configure } from "arktype/config"

// runs the suites with every scope jitless:
// pnpm testJitless [mocha option...]
configure({ jitless: true })
