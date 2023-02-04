// @ts-nocheck

import { TraversalState } from "./check"

const state = new TraversalState()

state.problems.add("divisibility", {
    data: 3,
    divisor: 2
})

state.problem("regex", {
    data: "foo",
    regex: ""
})

state.problems.add("regex")
