#!/bin/sh
# Called by "git commit" with no arguments.  The hook should
# exit with non-zero status after issuing an appropriate message if
# it wants to stop the commit.

# Invoke the "rush prettier" custom command to reformat files whenever they
# are committed. The command is defined in common/config/rush/command-line.json
# and uses the "rush-prettier" autoinstaller.
node common/scripts/install-run-rush.js prettier || exit $?
