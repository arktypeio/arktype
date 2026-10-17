// e.g. BENCH_ARKTYPE_CONFIG='{"mutatesInput":"always"}' configures arktype, so the
// arktype arm runs under it, before any module defines a Type
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { configure } from "arktype/config"
import "arktype/errors"

export const arktypeConfigJson = process.env.BENCH_ARKTYPE_CONFIG

if (arktypeConfigJson) configure(JSON.parse(arktypeConfigJson))
