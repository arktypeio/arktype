// Crated to solve https://github.com/facebook/jest/issues/5064 which was blocking CI builds
import { DefaultReporter } from "@jest/reporters"

export default class StdoutReporter extends DefaultReporter {
    log(message: string) {
        process.stdout.write(`${message}\n`)
    }

    printTestFileFailureMessage(
        ...args: Parameters<DefaultReporter["printTestFileFailureMessage"]>
    ) {
        try {
            this.log = (message) => process.stderr.write(`${message}\n`)
            return super.printTestFileFailureMessage(...args)
        } finally {
            this.log = (message) => process.stdout.write(`${message}\n`)
        }
    }
}
