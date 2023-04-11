# oclif-hello-world

oclif example Hello World CLI

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/oclif-hello-world.svg)](https://npmjs.org/package/oclif-hello-world)
[![CircleCI](https://circleci.com/gh/oclif/hello-world/tree/main.svg?style=shield)](https://circleci.com/gh/oclif/hello-world/tree/main)
[![Downloads/week](https://img.shields.io/npm/dw/oclif-hello-world.svg)](https://npmjs.org/package/oclif-hello-world)
[![License](https://img.shields.io/npm/l/oclif-hello-world.svg)](https://github.com/oclif/hello-world/blob/main/package.json)

<!-- toc -->

-   [Usage](#usage)
-   [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->

```sh-session
$ npm install -g attest-cli
$ attest COMMAND
running command...
$ attest (--version)
attest-cli/0.0.0 darwin-x64 node-v18.6.0
$ attest --help [COMMAND]
USAGE
  $ attest COMMAND
...
```

<!-- usagestop -->

# Commands

<!-- commands -->

-   [`attest hello PERSON`](#attest-hello-person)
-   [`attest hello world`](#attest-hello-world)
-   [`attest help [COMMANDS]`](#attest-help-commands)
-   [`attest plugins`](#attest-plugins)
-   [`attest plugins:install PLUGIN...`](#attest-pluginsinstall-plugin)
-   [`attest plugins:inspect PLUGIN...`](#attest-pluginsinspect-plugin)
-   [`attest plugins:install PLUGIN...`](#attest-pluginsinstall-plugin-1)
-   [`attest plugins:link PLUGIN`](#attest-pluginslink-plugin)
-   [`attest plugins:uninstall PLUGIN...`](#attest-pluginsuninstall-plugin)
-   [`attest plugins:uninstall PLUGIN...`](#attest-pluginsuninstall-plugin-1)
-   [`attest plugins:uninstall PLUGIN...`](#attest-pluginsuninstall-plugin-2)
-   [`attest plugins update`](#attest-plugins-update)

## `attest hello PERSON`

Say hello

```
USAGE
  $ attest hello PERSON -f <value>

ARGUMENTS
  PERSON  Person to say hello to

FLAGS
  -f, --from=<value>  (required) Who is saying hello

DESCRIPTION
  Say hello

EXAMPLES
  $ oex hello friend --from oclif
  hello friend from oclif! (./src/commands/hello/index.ts)
```

_See code: [dist/commands/hello/index.ts](https://github.com/ssalbdivad/arktype/blob/v0.0.0/dist/commands/hello/index.ts)_

## `attest hello world`

Say hello world

```
USAGE
  $ attest hello world

DESCRIPTION
  Say hello world

EXAMPLES
  $ attest hello world
  hello world! (./src/commands/hello/world.ts)
```

## `attest help [COMMANDS]`

Display help for attest.

```
USAGE
  $ attest help [COMMANDS] [-n]

ARGUMENTS
  COMMANDS  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for attest.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.2.9/src/commands/help.ts)_

## `attest plugins`

List installed plugins.

```
USAGE
  $ attest plugins [--core]

FLAGS
  --core  Show core plugins.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ attest plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.4.4/src/commands/plugins/index.ts)_

## `attest plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ attest plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Installs a plugin into the CLI.
  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.


ALIASES
  $ attest plugins add

EXAMPLES
  $ attest plugins:install myplugin

  $ attest plugins:install https://github.com/someuser/someplugin

  $ attest plugins:install someuser/someplugin
```

## `attest plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ attest plugins:inspect PLUGIN...

ARGUMENTS
  PLUGIN  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ attest plugins:inspect myplugin
```

## `attest plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ attest plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Installs a plugin into the CLI.
  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.


ALIASES
  $ attest plugins add

EXAMPLES
  $ attest plugins:install myplugin

  $ attest plugins:install https://github.com/someuser/someplugin

  $ attest plugins:install someuser/someplugin
```

## `attest plugins:link PLUGIN`

Links a plugin into the CLI for development.

```
USAGE
  $ attest plugins:link PLUGIN

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Links a plugin into the CLI for development.
  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ attest plugins:link myplugin
```

## `attest plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ attest plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ attest plugins unlink
  $ attest plugins remove
```

## `attest plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ attest plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ attest plugins unlink
  $ attest plugins remove
```

## `attest plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ attest plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ attest plugins unlink
  $ attest plugins remove
```

## `attest plugins update`

Update installed plugins.

```
USAGE
  $ attest plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

<!-- commandsstop -->
