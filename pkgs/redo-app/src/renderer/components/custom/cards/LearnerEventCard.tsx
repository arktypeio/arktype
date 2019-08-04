import React from "react"

import { BrowserEventInput } from "renderer/common"
import { ContentCard } from "redo-components"

export type LearnerEventCardProps = {
    event: BrowserEventInput
}

export const LearnerEventCard = ({ event }: LearnerEventCardProps) => (
    <ContentCard from={event as any} />
)
