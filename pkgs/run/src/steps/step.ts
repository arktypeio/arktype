import { StepKinds } from "../common"
import { click } from "./click"
import { go } from "./go"
import { screenshot } from "./screenshot"
import { set } from "./set"
import { assertText } from "./assertText"

export type { Step } from "@re-do/model"

export const defaultStepKinds: StepKinds = {
    click,
    go,
    set,
    screenshot,
    assertText
}
