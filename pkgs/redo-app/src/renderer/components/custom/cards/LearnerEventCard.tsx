import React, { FC } from "react"
import { BrowserEventInput } from "redo-model"
import { ContentCard } from "redo-components"

export type LearnerEventCardProps = {
    event: BrowserEventInput
}

export const LearnerEventCard: FC<LearnerEventCardProps> = ({ event }) => (
    <ContentCard from={event as any} />
)
