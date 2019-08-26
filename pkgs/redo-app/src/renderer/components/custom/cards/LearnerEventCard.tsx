import React, { FC } from "react"
import { StepInput } from "redo-model"
import { ContentCard } from "redo-components"

export type LearnerEventCardProps = {
    event: StepInput
}

export const LearnerEventCard: FC<LearnerEventCardProps> = ({ event }) => (
    <ContentCard from={event as any} />
)
