import React from "react"
import useBaseUrl from "@docusaurus/useBaseUrl"
import { Column, Row, Text } from "@re-do/components"
import { FeatureData } from "../content"

type FeatureProps = FeatureData

const Feature = ({ imageUrl, title, description }: FeatureProps) => {
    const imgUrl = useBaseUrl(imageUrl)
    return (
        <Column width={361} align="center" style={{ padding: 8 }}>
            <img style={{ height: 200, width: 200 }} src={imgUrl} />
            <Text variant="h5">{title}</Text>
            <Text>{description}</Text>
        </Column>
    )
}

export type FeaturesProps = {
    content: FeatureProps[]
}

export const Features = ({ content }: FeaturesProps) => (
    <Row
        wrap="wrap"
        justify="space-around"
        align="baseline"
        style={{ padding: 0 }}
    >
        {content.map((props, idx) => (
            <Feature key={idx} {...props} />
        ))}
    </Row>
)
