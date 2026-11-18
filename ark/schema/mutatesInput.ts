// imported first so shared modules load in index order
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import "./index.ts"
import { inPlaceTransforms } from "./shared/inPlace.ts"
import { $ark } from "./shared/registry.ts"

export { inputOnlyMorphs, writesInPlace } from "./shared/inPlace.ts"

// installs in-place transforms, which mutatesInput configures
$ark.inPlace = inPlaceTransforms
