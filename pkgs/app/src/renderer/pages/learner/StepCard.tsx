import React from "react"
import { Step } from "@re-do/test"
import { ContentCard } from "@re-do/components"

export type StepCardProps = {
    step: Step
}

export const StepCard = ({ step }: StepCardProps) => (
    <ContentCard from={step} />
)
