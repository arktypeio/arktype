import React, { FC, cloneElement } from "react"
import { Button } from "../buttons"
import { Card } from "../cards"
import { Text } from "../text"
import { useTheme } from "../styles"
import { Row, Column } from "../layouts"
import { Dialog } from "@material-ui/core"
import { DialogProps } from "@material-ui/core/Dialog"
import { Fields } from "../forms"
import { DisplayAs } from "../displayAs"

export type ModalViewProps = DialogProps & {
    displayAs: DisplayAs
    fields?: Fields
}

export const ModalView: FC<ModalViewProps> = ({
    displayAs,
    fields,
    ...rest
}) => {
    const theme = useTheme()
    const { actions } = displayAs
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
                    {actions
                        ? actions.map(action => (
                              <Button kind="secondary">{action}</Button>
                          ))
                        : null}
                </Row>
            </Card>
        </Dialog>
    )
}
