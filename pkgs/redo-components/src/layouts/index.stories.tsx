import React from "react"
import { storiesOf } from "@storybook/react"
import { withTheme } from "../storybook"
import { defaultTheme } from "../themes"
import { Row, Column } from "."
import { Card } from "../cards"
import { Item } from "./Item"

storiesOf("Layout", module)
    .addDecorator(
        withTheme({
            ...defaultTheme,
            overrides: {
                MuiGrid: {
                    container: {
                        border: `solid ${defaultTheme.palette.primary.main}`
                    },
                    item: {
                        border: `solid ${defaultTheme.palette.secondary.main}`
                    }
                }
            }
        })
    )
    .add("Row of cards", () => {
        return (
            <Row justify="space-around">
                <Card>One</Card>
                <Card>Two</Card>
                <Card>Three</Card>
            </Row>
        )
    })
    .add("Row of card items", () => {
        return (
            <Row>
                <Item xs={2}>
                    <Card>Small</Card>
                </Item>
                <Item xs={8}>
                    <div>Big</div>
                </Item>
                <Item xs={2}>
                    <Card>Small</Card>
                </Item>
            </Row>
        )
    })
