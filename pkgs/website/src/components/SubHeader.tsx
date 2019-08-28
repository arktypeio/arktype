import React from "react"
import { Column, Text, Row } from "@re-do/components"
import { copy } from "../constants"

export const SubHeader = () => {
    return (
        <div style={{ padding: 32 }}>
            <Column align="center" spacing={2}>
                <Text variant="h4">{copy.subheader.title}</Text>
                <Text>{copy.subheader.content}</Text>
                <Row wrap="wrap">
                    {copy.subheader.features.map((text, index) => (
                        <Column key={index} xs={6}>
                            <Text>{text}</Text>
                        </Column>
                    ))}
                </Row>
            </Column>
        </div>
    )
}
