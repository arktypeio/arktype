import React, { FC } from "react"
import { BrowserEventInput } from "redo-model"
import { ContentCard } from "redo-components"

//TODO: https://trello.com/c/QjInW5CL fix BrowserEventInput type
export type LearnerEventCardProps = {
    event: BrowserEventInput
}

export const LearnerEventCard: FC<LearnerEventCardProps> = ({ event }) => (
    <ContentCard from={event as any} />
)
