// e.g. BENCH_ARKTYPE_CONFIG='{"mutatesInput":"always"}', before any Type exists
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { configure } from "arktype/config"
import "arktype/errors"
import "arktype/mutatesInput"

export const arktypeConfigJson = process.env.BENCH_ARKTYPE_CONFIG

if (arktypeConfigJson) configure(JSON.parse(arktypeConfigJson))
