import {Grammar, Parser} from "nearley";

export default function reference(type: any, opts: any) {
    const prebuiltgrammar: Grammar = Grammar.fromCompiled(require('../../nearley-prebuilt/nearley-language-bootstrapped'));
    const prebuiltparser: Parser = new Parser(prebuiltgrammar);

    if(type === "1") {
        prebuiltparser.feed('root -> ("hi":?|"bye":*)');
    } else if(type === "2") {
        prebuiltparser.feed('root -> ("hi":?|"bye":*) {% d => ("hi or bye") %}');
    }

    console.log(JSON.stringify(prebuiltparser.results/*, null, 2*/));
}
