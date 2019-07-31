import React, { FC } from "react"
import { Row, Text, Card } from "redo-components"
import { Icon } from "@material-ui/core"
import TrendingUp from "@material-ui/icons/TrendingUp"
import WhatsHot from "@material-ui/icons/Whatshot"
import Code from "@material-ui/icons/Code"

export const HowItWorks: FC = () => {
    return (
        <Row justify="space-between">
            <Card>
                <Code fontSize="large" />
                <Text variant={"h4"}>We're</Text>
            </Card>
            <Card>
                <TrendingUp fontSize="large" />
                <Text variant={"h4"}>Fucking</Text>
            </Card>
            <Card>
                <WhatsHot fontSize="large" />
                <Text variant={"h4"}>Awesome</Text>
            </Card>
        </Row>
    )
}
