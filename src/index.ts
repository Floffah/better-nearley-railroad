#!/usr/bin/env node

import railroad from "./cmds/railroad";
import reference from "./cmds/reference";

const program = require('commander');

program
    .version(require('../package.json').version)
    .arguments("[file.ne] [grammar.html]")
    .action(railroad);

program
    .command("reference <type>")
    .option("-p, --prettify", "Prettify output")
    .option("-o, --out", "file to write to")
    .action(reference)

program.parse(process.argv);
