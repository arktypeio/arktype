// @ts-nocheck

import { TraversalState } from "./traverse"

const state = new TraversalState()

state.problems.add("divisor", {
    data: 3,
    divisor: 2
})

state.problem("regex", {
    data: "foo",
    regex: ""
})

state.problems.add("regex")
