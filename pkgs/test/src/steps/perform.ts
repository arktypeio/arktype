import { ValueOf } from "@re-do/utils"
import { Context } from "../common"
import { click } from "./click"
import { go } from "./go"
import { screenshot } from "./screenshot"
import { set } from "./set"

export const stepTypes = {
    click,
    go,
    set,
    screenshot
}

export type StepTypes = typeof stepTypes

export type StepName = keyof StepTypes

export type StepArgs<K extends StepName> = Parameters<StepTypes[K]>[0]

export type Step = ValueOf<
    { [K in keyof StepTypes]: { kind: K } & StepArgs<K> }
>

export const perform = async ({ kind, ...args }: Step, context: Context) =>
    await stepTypes[kind](args as any, context)
