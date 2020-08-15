#!/usr/bin/env node

import railroad from "./cmds/railroad";
import reference from "./cmds/reference";

const program = require('commander');

program
    .version(require('../package.json').version)
    .arguments("[grammar.js] [grammar.html]")
    .option("-c, --config <file>", "Path to a json config")
    .option("-t, --template", "Path to a template directory")
    .action(railroad);

program
    .command("reference <type>")
    .option("-p, --prettify", "Prettify output")
    .option("-o, --out", "file to write to")
    .action(reference)

program.parse(process.argv);
