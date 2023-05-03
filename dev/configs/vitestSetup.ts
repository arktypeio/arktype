import { cleanup, setup } from "../attest/src/type/cacheAssertions.js"

export default () => {
    setup()
    return cleanup
}
