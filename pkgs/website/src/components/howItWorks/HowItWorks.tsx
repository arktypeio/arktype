import React from "react"
import { Row, Text, Column } from "@re-do/components"
import { steps } from "content"
import { Steps } from "./Steps"

export const HowItWorks = () => {
    const maxWidth = window.innerWidth >= 528 ? 480 : 0.9 * window.innerWidth
    return (
        <Column align="center" style={{ paddingTop: 48 }}>
            <Text variant="h2" style={{ fontWeight: 700 }}>
                How it works
            </Text>
            <Row wrap="wrap" justify="center" style={{ maxWidth }}>
                <div style={{ maxWidth }}>
                    <Steps>{steps}</Steps>
                </div>
                <video
                    style={{ maxWidth }}
                    src="assets/RedoDemo.mp4"
                    controls
                />
            </Row>
        </Column>
    )
}
