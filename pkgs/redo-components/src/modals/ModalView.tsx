import React, { FC, cloneElement } from "react"
import { Button } from "../buttons"
import { Card } from "../cards"
import { Text } from "../text"
import { useTheme } from "../styles"
import { Row, Column } from "../layouts"
import { Dialog } from "@material-ui/core"
import { DialogProps } from "@material-ui/core/Dialog"

export type ModalViewProps = DialogProps & {}

// currently this is specific to tests. That will be abstracted away before PR
export const ModalView: FC<ModalViewProps> = ({ ...rest }) => {
    const theme = useTheme()
    return (
        <Dialog {...rest}>
            <Card
                style={{
                    minHeight: theme.spacing(30),
                    minWidth: theme.spacing(30),
                    padding: theme.spacing(2)
                }}
            >
                <Row>
                    <Column>
                        <Text>Test name</Text>
                        <Text>Tags go here</Text>
                    </Column>
                    <Button kind="primary">Run test</Button>
                    <Button kind="secondary">Delete test</Button>
                </Row>
                <Text>BrowserEvents go here</Text>
            </Card>
        </Dialog>
    )
}
