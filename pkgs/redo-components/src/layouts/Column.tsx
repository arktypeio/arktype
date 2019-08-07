import React, { FC } from "react"
import { Container, ContainerProps } from "./Container"

export type ColumnProps = Omit<ContainerProps, "direction">

export const Column: FC<ColumnProps> = ({ style, ...rest }) => (
    <Container
        direction="column"
        style={{ height: "100%", width: "fit-content", ...style }}
        {...rest}
    />
)
