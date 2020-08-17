import {existsSync, readFileSync, writeFileSync} from "fs";
import {resolve} from 'path';

const rr = require('railroad-diagrams');
const m = require('mustache');

let dodebug:boolean = false;

export default function railroad(grammar: any, out: string, opts: any) {
    let settings: options = opts;
    if (opts.config && isJson(readFileSync(resolve(process.cwd(), opts.config), "utf8"))) {
        settings = JSON.parse(readFileSync(resolve(process.cwd(), opts.config), "utf8"));
    }

    settings = {
        template: settings.template || resolve(__dirname, "../../template")
    }

    if(!existsSync(resolve(process.cwd(), grammar))) {
        console.log(`${resolve(process.cwd(), grammar)} does not exist. Please make sure you are passing the correct path to your grammar file.`);
        process.exit(1);
    }

    if(!existsSync(resolve(settings.template, "index.html"))) {
        console.log(`${resolve(settings.template, "index.html")} does not exist. Please make sure you are passing the correct path to your grammar file.`);
        process.exit(1);
    }

    let template = readFileSync(resolve(settings.template, "index.html"), 'utf8')

    grammar = require(resolve(process.cwd(), grammar));
    let rules: Map<string, parserrule[]> = new Map();

    if(opts.debug) {
        dodebug = true;
    }

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

    let rulekeys: string[] = [];

    for(let rule of rules.keys()) {
        rulekeys.push(rule);
    }

    let page = m.render(template, {
        name: "Test",
        start: grammar.ParserStart,
        diagrams,
        ruleslist: JSON.stringify(rulekeys)
    });

    writeFileSync(resolve(process.cwd(), out), page);

    console.log("Done!");
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
        if(dodebug) console.log(`Scanning rule "${start}"...`);
        if (rule.length === 1) {
            let bit = rule[0];
            for (let symbol of bit.symbols) {
                if (typeof symbol === "string" && /[A-z]\$ebnf\$1/.test(symbol)) {
                    let ebnf = rules.get(symbol);
                    if (ebnf !== undefined) {
                        if (ebnf[0].symbols.length > 0 && ebnf[1].symbols.length === 0) {
                            if(dodebug) console.log(`Rule "${symbol}" is an optional ebnf rule`);
                            ebnf[0].symbols.forEach((symboll) => {
                                if(typeof symboll === "string" && !diagrammed.includes(symboll) && rules.has(symboll)) {
                                    if(dodebug) console.log(`Came across new rule "${symboll}" in rule "${symbol}"`);
                                    toreturn.push(...traceandgram(rules, symboll, diagrammed, false));
                                }
                            });
                            bits.push(rr.Optional(rr.Sequence(...traceandgram(rules, ebnf[0].name, diagrammed, true, ebnf[0]))));
                        } else if(ebnf[0].symbols[0] === ebnf[1].symbols[1] && ebnf[1].symbols[0] === ebnf[0].name) {
                            if(dodebug) console.log(`Rule "${symbol}" is a loop ebnf rule`);
                            ebnf[0].symbols.forEach((symboll) => {
                                if(typeof symboll === "string" && !diagrammed.includes(symboll) && rules.has(symboll)) {
                                    if(dodebug) console.log(`Came across new rule "${symboll}" in rule "${symbol}"`);
                                    toreturn.push(...traceandgram(rules, symboll, diagrammed, false));
                                }
                            });
                            bits.push(rr.OneOrMore(rr.Sequence(...traceandgram(rules, ebnf[0].name, diagrammed, true, ebnf[0]))));
                        }
                    }
                } else if(typeof symbol === "string" && /[A-z]\$subexpression\$1/.test(symbol)) {
                    let ebnf = rules.get(symbol);
                    if(ebnf !== undefined) {
                        if(dodebug) console.log(`Rule "${symbol}" is a subexpression`);
                        if(ebnf[0].symbols.length > 0 && ebnf[1].symbols.length > 0) {
                            let subchoices:any[] = [];
                            ebnf.forEach((value) => {
                                subchoices.push(rr.Choice(0, ...traceandgram(rules, "", diagrammed, true, value)));
                            });
                            bits.push(rr.Sequence(...subchoices));
                        }
                    }
                } else if (typeof symbol === "string") {
                    if(dodebug) console.log(`Rule "${symbol}" is a non-terminal string`);
                    bits.push(rr.NonTerminal(symbol));
                    if (!diagrammed.includes(symbol) && rules.has(symbol)) {
                        diagrammed.push(symbol);
                        toreturn.push(...traceandgram(rules, symbol, diagrammed, false));
                    }
                } else if (symbol.type) {
                    if(dodebug) console.log(`Rule "${symbol.type}" is a non-terminal lexer value`);
                    bits.push(rr.NonTerminal("%" + symbol.type));
                } else if(symbol.literal) {
                    if(dodebug) console.log(`Rule "${symbol.literal}" is terminal/literal`);
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
                                if(dodebug) console.log(`Rule "${symbol}" is an optional ebnf rule`);
                                ebnf[0].symbols.forEach((symboll) => {
                                    if(typeof symboll === "string" && !diagrammed.includes(symboll) && rules.has(symboll)) {
                                        if(dodebug) console.log(`Came across new rule "${symboll}" in rule "${symbol}"`);
                                        toreturn.push(...traceandgram(rules, symboll, diagrammed, false));
                                    }
                                });
                                topush.push(rr.Optional(rr.Sequence(...traceandgram(rules, ebnf[0].name, diagrammed, true, ebnf[0]))));
                            } else if(ebnf[0].symbols[0] === ebnf[1].symbols[1] && ebnf[1].symbols[0] === ebnf[0].name) {
                                if(dodebug) console.log(`Rule "${symbol}" is a loop ebnf rule`);
                                ebnf[0].symbols.forEach((symboll) => {
                                    if(typeof symboll === "string" && !diagrammed.includes(symboll) && rules.has(symboll)) {
                                        if(dodebug) console.log(`Came across new rule "${symboll}" in rule "${symbol}"`);
                                        toreturn.push(...traceandgram(rules, symboll, diagrammed, false));
                                    }
                                });
                                topush.push(rr.OneOrMore(rr.Sequence(...traceandgram(rules, ebnf[0].name, diagrammed, true, ebnf[0]))));
                            }
                        }
                    } else if(typeof symbol === "string" && /[A-z]\$subexpression\$1/.test(symbol)) {
                        let ebnf = rules.get(symbol);
                        if(ebnf !== undefined) {
                            if(dodebug) console.log(`Rule "${symbol}" is a subexpression`);
                            if(ebnf[0].symbols.length > 0 && ebnf[1].symbols.length > 0) {
                                let subchoices:any[] = [];
                                ebnf.forEach((value) => {
                                    subchoices.push(rr.Choice(0, ...traceandgram(rules, "", diagrammed, true, value)));
                                });
                                topush.push(rr.Sequence(...subchoices));
                            }
                        }
                    } else if (typeof symbol === "string") {
                        if(dodebug) console.log(`Rule "${symbol}" is a non-terminal string`);
                        topush.push(rr.NonTerminal(symbol));
                        if (!diagrammed.includes(symbol) && rules.has(symbol)) {
                            diagrammed.push(symbol);
                            toreturn.push(...traceandgram(rules, symbol, diagrammed, false));
                        }
                    } else if (symbol.type) {
                        if(dodebug) console.log(`Rule "${symbol.type}" is a non-terminal lexer value`);
                        topush.push(rr.NonTerminal("%" + symbol.type));
                    } else if(symbol.literal) {
                        if(dodebug) console.log(`Rule "${symbol.literal}" is terminal/literal`);
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
