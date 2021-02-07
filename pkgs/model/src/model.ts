import { Step } from "@re-do/test"
import { createStore } from "statelessly"

export type Test = {
    name: string
    steps: Step[]
    tags: string[]
}
