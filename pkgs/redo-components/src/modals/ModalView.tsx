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
    contents: Record<string, any>
}

export const ModalView: FC<ModalViewProps> = ({
    displayAs,
    fields,
    contents,
    ...rest
}) => {
    const theme = useTheme()
    const { actions } = displayAs
    console.log(contents)
    console.log(contents!.steps)
    return (
        <Dialog {...rest}>
            <Card
                style={{
                    minHeight: theme.spacing(30),
                    minWidth: theme.spacing(30),
                    padding: theme.spacing(2)
                }}
            >
                <Column>
                    <Row>
                        {actions
                            ? actions.map(action => (
                                  <Button kind="secondary">{action}</Button>
                              ))
                            : null}
                    </Row>

                    {contents && contents.steps
                        ? Object.entries(contents!.steps).map(
                              ([k, v], index) => (
                                  <Text key={index}>{JSON.stringify(v)}</Text>
                              )
                          )
                        : null}
                </Column>
            </Card>
        </Dialog>
    )
}
