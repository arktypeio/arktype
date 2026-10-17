// installs in-place transforms, which mutatesInput configures
// imported first, so modules a split bundle shares run in the index's order
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import "./index.ts"
export { writesInPlace } from "./shared/inPlace.ts"
