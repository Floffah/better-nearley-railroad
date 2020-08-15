import {readFileSync, writeFileSync} from "fs";
import {resolve} from 'path';

const rr = require('railroad-diagrams');
const m = require('mustache');

export default function railroad(grammar: any, out: string, opts: any) {
    let settings: options = opts;
    if (opts.config && isJson(readFileSync(resolve(process.cwd(), opts.config), "utf8"))) {
        settings = JSON.parse(readFileSync(resolve(process.cwd(), opts.config), "utf8"));
    }

    settings = {
        template: settings.template || "../template"
    }

    let template = readFileSync(resolve(settings.template, "index.html"), 'utf8')

    grammar = require(resolve(process.cwd(), grammar));
    let rules: Map<string, parserrule> = new Map();

    for (let rule of grammar.ParserRules) {
        if (rules.has(rule.name)) {
            rules.set(rule.name + "@@1", rule);
        } else {
            rules.set(rule.name, rule);
        }
    }

    let diagrams: diagram[] = [];

    diagrams.push(...traceandgram(rules, grammar.ParserStart));

    let page = m.render(template, {
        name: "Test",
        diagrams
    });

    writeFileSync(resolve(process.cwd(), out), page);
}

function traceandgram(rules: Map<string, parserrule>, start: string): diagram[] {
    let toreturn: diagram[] = [];

    toreturn.push({
        name: "test",
        // @ts-ignore
        diagram: rr.Diagram(rr.Terminal(rules.get(start).name)).toString()
    });

    return toreturn;
}

interface diagram {
    diagram: string,
    name: string
}

interface options {
    template: string
}

interface parserrule {
    name: string,
    symbols: (string | boolean | symboltype | any)[],
    postprocess: (d: any[]) => any
}

interface symboltype {
    type: string
}

export function isJson(data: string): boolean {
    try {
        JSON.parse(data);
    } catch (e) {
        return false;
    }
    return true;
}
