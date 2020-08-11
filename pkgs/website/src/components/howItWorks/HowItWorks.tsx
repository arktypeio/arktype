import React from "react"
import { Row, Text, Column } from "@re-do/components"
import { steps } from "content"
import { Steps } from "./Steps"

export const HowItWorks = () => {
    return (
        <Column align="center" style={{ paddingTop: 48 }}>
            <Text variant="h2" style={{ fontWeight: 700 }}>
                How it works
            </Text>
            <Row wrap="wrap" justify="center" style={{ maxWidth: "90vw" }}>
                <div style={{ width: 480 }}>
                    <Steps>{steps}</Steps>
                </div>
                <video
                    style={{ width: 480 }}
                    src="assets/RedoDemo.mp4"
                    controls
                />
            </Row>
        </Column>
    )
}
