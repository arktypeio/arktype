import React, { FC, useState } from "react"
import { Theme } from "@material-ui/core"
import { useTheme } from "@material-ui/styles"
import { BaseTextFieldProps as MuiTextFieldProps } from "@material-ui/core/TextField"
import { TextField } from "@material-ui/core"
import { makeStyles } from "@material-ui/styles"
import { makeKinds, KindsFrom } from "../../common"

const stylizeOutlined = makeStyles((theme: Theme) => ({
    focused: {},
    disabled: {},
    error: {},
    notchedOutline: {},
    root: {
        color: theme.palette.primary.dark,
        "&$focused $notchedOutline": {
            borderColor: theme.palette.secondary.main
        },
        "&:not($focused) $notchedOutline": {
            borderColor: theme.palette.primary.light
        },
        "&$error $notchedOutline": {
            borderColor: theme.palette.error.main
        },
        "&:hover:not($disabled):not($focused):not($error) $notchedOutline": {
            borderColor: theme.palette.primary.dark,
            "@media (hover: none)": {
                borderColor: theme.palette.primary.light
            }
        }
    }
}))

type TextInputKindsOptions = {
    state: {
        focused: boolean
        hovered: boolean
        error: boolean
    }
    theme: Theme
}

const stylize = makeStyles((theme: Theme) => ({
    defaultClass: { borderColor: theme.palette.primary.dark },
    errorClass: { borderColor: theme.palette.error.main },
    focusedClass: { borderColor: theme.palette.secondary.main },
    hoveredClass: { borderColor: theme.palette.primary.light }
}))

const getBorderClass = ({ state, theme }: TextInputKindsOptions) => {
    const { defaultClass, errorClass, focusedClass, hoveredClass } = stylize()
    const { focused, hovered, error } = state
    return focused
        ? focusedClass
        : error
        ? errorClass
        : hovered
        ? hoveredClass
        : defaultClass
}

const useKind = makeKinds<MuiTextFieldProps>()(
    ({ state, theme }: TextInputKindsOptions) => ({
        outlined: {
            fake: "jake",
            variant: "outlined",
            InputProps: {
                classes: {
                    notchedOutline: getBorderClass({ state, theme })
                }
            }
        },
        underlined: {
            variant: "standard"
        }
    })
)

export type TextInputProps = MuiTextFieldProps & {
    kind: KindsFrom<typeof useKind>
}

export const TextInput: FC<TextInputProps> = ({ kind, ...rest }) => {
    const theme = useTheme<Theme>()
    const [state, setState] = useState({
        focused: false,
        error: false,
        hovered: false
    })
    return (
        <TextField
            margin="dense"
            onFocus={() => setState({ ...state, focused: true })}
            onBlur={() => setState({ ...state, focused: false })}
            onError={() => setState({ ...state, error: true })}
            onReset={() => setState({ ...state, error: false })}
            onMouseOver={() => setState({ ...state, hovered: true })}
            onMouseOut={() => setState({ ...state, hovered: false })}
            InputLabelProps={{
                style: {
                    color: state.focused
                        ? theme.palette.primary.dark
                        : theme.palette.primary.light
                }
            }}
            {...useKind(kind, { state, theme }) as any}
            {...rest}
        />
    )
}
