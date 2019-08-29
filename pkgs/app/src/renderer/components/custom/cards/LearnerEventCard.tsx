import React, { FC } from "react"
import { StepInput } from "@re-do/model"
import { ContentCard } from "@re-do/components"

export type LearnerEventCardProps = {
    event: StepInput
}

export const LearnerEventCard: FC<LearnerEventCardProps> = ({ event }) => (
    <ContentCard from={event as any} />
)
