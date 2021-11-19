import { getJestConfig } from "@re-do/node"

export default {
    ...getJestConfig(),
    reporters: ["default", "jest-stare"]
}
