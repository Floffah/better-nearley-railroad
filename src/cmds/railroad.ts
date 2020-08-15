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

function traceandgram(rules: Map<string, parserrule>, start: string, issub?: boolean): diagram[] {
    let toreturn: diagram[] = [];

    let rule = rules.get(start);

    let argbase: any[] = [];

    if (rule !== undefined) {
        rule.symbols.forEach(symbol => {
            console.log(start, symbol);
            if (typeof symbol === "string" && !/[A-z]\$ebnf\$[0-9]/.test(symbol)) {
                argbase.push(rr.NonTerminal(symbol));
            } else if (typeof symbol === "string" && /[A-z]\$ebnf\$[0-9]/.test(symbol)) {
                let path1 = rules.get(`${start}$ebnf$1`);
                let path2 = rules.get(`${start}$ebnf$1@@1`);
                if (path1 !== undefined && path2 !== undefined) {
                    if (path1.symbols.length > 0 && path2.symbols.length > 0) {
                        argbase.push(rr.Choice(0, rr.Sequence(...traceandgram(rules, path1.name, true)), rr.Sequence(...traceandgram(rules, path2.name, true))));
                        console.log(path1, path2);
                    } else if(path1.symbols.length > 0 && path2.symbols.length === 0) {
                        argbase.push(rr.Optional(rr.Sequence(...traceandgram(rules, path1.name, true))));
                    }
                }
            } else { // @ts-ignore
                if (typeof symbol !== "string" && symbol.type) {
                    // @ts-ignore
                    argbase.push(rr.NonTerminal(symbol.type));
                }
            }
        })
    }

    if (!issub) {
        toreturn.push({
            name: "test",
            diagram: rr.Diagram(...argbase).toString()
        });

        return toreturn;
    } else {
        return argbase;
    }
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
    symbols: (string | boolean | { type: string })[],
    postprocess: (d: string[]) => any
}

export function isJson(data: string): boolean {
    try {
        JSON.parse(data);
    } catch (e) {
        return false;
    }
    return true;
}
