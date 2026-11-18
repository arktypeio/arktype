// imported first so shared modules load in index order
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import "./index.ts"
import { encode } from "./shared/codecs.ts"
import { $ark } from "./shared/registry.ts"

export * from "./shared/codecs.ts"

// installs encoding, which .encode requires
$ark.encode = encode
