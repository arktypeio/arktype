import React, { FC } from "react"
import { StepInput, Step } from "@re-do/model"
import { ContentCard } from "@re-do/components"

export type StepCardProps = {
    event: StepInput
}

export const StepCard = ({ event }: StepCardProps) => (
    <ContentCard from={event as any} />
)
