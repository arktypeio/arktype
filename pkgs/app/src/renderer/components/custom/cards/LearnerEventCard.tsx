import React, { FC } from "react"
import { BrowserEventInput } from "@re-do/model"
import { ContentCard } from "@re-do/components"

export type LearnerEventCardProps = {
    event: BrowserEventInput
}

export const LearnerEventCard: FC<LearnerEventCardProps> = ({ event }) => (
    <ContentCard from={event as any} />
)
