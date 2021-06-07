import React from "react"
import { Column, Text } from "@re-do/components"
import { FeatureData } from "../../content"

export type FeatureSummaryProps = FeatureData

export const FeatureSummary = ({
    image,
    title,
    description
}: FeatureSummaryProps) => (
    <Column style={{ maxWidth: 360 }} align="center">
        <img style={{ height: 200, width: 200 }} src={image} />
        <Text variant="h5" style={{ fontWeight: 700 }}>
            {title}
        </Text>
        <Text align="center">{description}</Text>
    </Column>
)
