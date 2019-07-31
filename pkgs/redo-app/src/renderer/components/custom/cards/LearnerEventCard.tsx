import React from "react"
import { BrowserEvent } from "redo-model"
import { ContentCard } from "redo-components"

export type LearnerEventCardProps = {
    event: BrowserEvent
}

export const LearnerEventCard = ({ event }: LearnerEventCardProps) => (
    <ContentCard from={event as any} />
)
