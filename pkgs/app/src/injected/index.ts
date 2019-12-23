import finder from "@medv/finder"
import { StepCreateWithoutUserCreateOnlyInput as StepInput } from "@re-do/model"

export const watchPage = async () => {
    const browserWindow: Window & {
        notify: (e: StepInput) => void
    } = window as any
    const events = {
        CLICK: "click",
        DBLCLICK: "dblclick",
        CHANGE: "change",
        SELECT: "select",
        SUBMIT: "submit"
    }
    Object.values(events).forEach(event =>
        browserWindow.addEventListener(
            event,
            async (e: Event) => {
                const step: StepInput = {
                    action: e.type,
                    selector: {
                        css: ""
                    },
                    value: ""
                }
                if (e.target) {
                    const target = e.target as HTMLElement
                    step.selector = { css: finder(target as HTMLElement) }
                    switch (e.type) {
                        case "change":
                            if (e.target) {
                                const inputTarget = target as HTMLInputElement
                                step.value = inputTarget.value
                            }
                    }
                }
                browserWindow.notify(step)
            },
            true
        )
    )
}

watchPage()
