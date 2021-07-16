import React from "react"
import { Row } from "@re-do/components"
import { FeatureSummary, FeatureSummaryProps } from "./FeatureSummary.js"

export type FeaturesProps = {
    content: FeatureSummaryProps[]
}

export const Features = ({ content }: FeaturesProps) => (
    <Row
        wrap="wrap"
        justify="space-around"
        align="baseline"
        style={{ padding: 0 }}
    >
        {content.map((props, id) => (
            <FeatureSummary key={id} {...props} />
        ))}
    </Row>
)
