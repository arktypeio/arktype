const { scripts, $, shell } = require("@re-do/scripts")

scripts({
    dev: {
        sayHello: $(`echo Hello`),
        sayGoodBye: $(`echo GoodBye`),
        "handle:non-alpha": $(`echo Handled`)
    },
    prod: {},
    shared: {}
})
