// installs in-place transforms, which mutatesInput configures
// imported first so shared modules load in index order
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import "./index.ts"
export { writesInPlace } from "./shared/inPlace.ts"
