import React from "react"
import useBaseUrl from "@docusaurus/useBaseUrl"
import { Column, Row } from "@re-do/components"

type FeatureProps = {
    imageUrl: string
    title: JSX.Element
    description: JSX.Element
}

const Feature = ({ imageUrl, title, description }: FeatureProps) => {
    const imgUrl = useBaseUrl(imageUrl)
    return (
        <Column width={361} style={{ padding: 25 }}>
            <img style={{ height: 200, width: 200 }} src={imgUrl} />
            <h3>{title}</h3>
            <p>{description}</p>
        </Column>
    )
}

export type FeaturesProps = {
    content: FeatureProps[]
}

export const Features = ({ content }: FeaturesProps) => (
    <Row wrap="wrap" justify="space-around" align="baseline">
        {content.map((props, idx) => (
            <Feature key={idx} {...props} />
        ))}
    </Row>
)
