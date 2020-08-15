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
    let rules: Map<string, parserrule[]> = new Map();

    for (let rule of grammar.ParserRules) {
        if (rules.has(rule.name) && rules.get(rule.name) !== undefined) {
            // @ts-ignore
            let oldrules: parserrule[] = rules.get(rule.name);
            oldrules.push(rule);
            rules.set(rule.name, oldrules);
        } else {
            rules.set(rule.name, [rule]);
        }
    }

    let diagrams: diagram[] = [];

    diagrams.push(...traceandgram(rules, grammar.ParserStart, [], false));

    diagrams.reverse();

    diagrams[0].comment = "- Start";

    if (opts.debug) {
        writeFileSync("./debug.json", JSON.stringify(Array.from(rules.entries()), null, 2));
        writeFileSync("./debug.railroad", JSON.stringify(diagrams, null, 2));
    }

    let page = m.render(template, {
        name: "Test",
        start: grammar.ParserStart,
        diagrams
    });

    writeFileSync(resolve(process.cwd(), out), page);
}

function traceandgram(rules: Map<string, parserrule[]>, start: string, diagrammed: string[], issub?: boolean, sub?: parserrule): diagram[] {
    let toreturn: diagram[] = [];

    let rule: parserrule[];
    if (rules.get(start) === undefined) {
        rule = [];
    } else {
        // @ts-ignore
        rule = rules.get(start);
    }
    if (sub) {
        rule = [sub];
    }

    let bits: any[] = [];

    if (rule !== undefined) {
        if (rule.length === 1) {
            let bit = rule[0];
            for (let symbol of bit.symbols) {
                if (typeof symbol === "string" && /[A-z]\$ebnf\$1/.test(symbol)) {
                    let ebnf = rules.get(symbol);
                    if (ebnf !== undefined) {
                        if (ebnf[0].symbols.length > 0 && ebnf[1].symbols.length === 0) {
                            bits.push(rr.Optional(rr.Sequence(...traceandgram(rules, ebnf[0].name, diagrammed, true, ebnf[0]))));
                        }
                    }
                } else if (typeof symbol === "string") {
                    bits.push(rr.NonTerminal(symbol));
                    if (!diagrammed.includes(symbol) && rules.has(symbol)) {
                        diagrammed.push(symbol);
                        toreturn.push(...traceandgram(rules, symbol, diagrammed, false));
                    }
                } else if (symbol.type) {
                    bits.push(rr.NonTerminal(symbol.type + " (lexer)"));
                } else if(symbol.literal) {
                    bits.push(rr.Terminal(symbol.literal));
                }
            }
        } else if (rule.length > 1) {
            let bitss: any[] = [];
            rule.forEach((bit: parserrule) => {
                let topush: any[] = [];
                bit.symbols.map((symbol) => {
                    if (typeof symbol === "string" && /[A-z]\$ebnf\$1/.test(symbol)) {
                        let ebnf = rules.get(symbol);
                        if (ebnf !== undefined) {
                            if (ebnf[0].symbols.length > 0 && ebnf[1].symbols.length === 0) {
                                topush.push(rr.Optional(rr.Sequence(...traceandgram(rules, ebnf[0].name, diagrammed, true, ebnf[0]))));
                            }
                        }
                    } else if (typeof symbol === "string") {
                        topush.push(rr.NonTerminal(symbol));
                        if (!diagrammed.includes(symbol) && rules.has(symbol)) {
                            diagrammed.push(symbol);
                            toreturn.push(...traceandgram(rules, symbol, diagrammed, false));
                        }
                    } else if (symbol.type) {
                        topush.push(rr.NonTerminal(symbol.type + " (lexer)"));
                    } else if(symbol.literal) {
                        topush.push(rr.Terminal(symbol.literal));
                    }
                });
                bitss.push(rr.Sequence(...topush));
            });
            bits.push(rr.Choice(0, ...bitss));
        }
    }

    if (issub) {
        return bits;
    } else {
        toreturn.push({
            name: start,
            diagram: rr.Diagram(...bits).toString(),
        })
        return toreturn;
    }
}

interface diagram {
    diagram: string,
    name: string,
    comment?: string,
}

interface options {
    template: string
}

interface parserrule {
    name: string,
    symbols: (string | { literal: string, type: string } )[],
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
