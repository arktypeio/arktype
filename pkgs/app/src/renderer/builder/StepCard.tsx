import React from "react"
import { Step } from "@re-do/test"
import { Card } from "@re-do/components"

export type StepCardProps = {
    step: Step
}

export const StepCard = ({ step }: StepCardProps) => (
    <Card>{JSON.stringify(step, null, 4)}</Card>
)
