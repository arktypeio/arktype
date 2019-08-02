import React, { FC } from "react"
import { BrowserEvent } from "redo-model"
import { ContentCard } from "redo-components"

export type LearnerEventCardProps = {
    event: BrowserEvent
}

export const LearnerEventCard: FC<LearnerEventCardProps> = ({ event }) => (
    <ContentCard from={event as any} />
)
