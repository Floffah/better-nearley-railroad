import {Grammar, Parser} from "nearley";
import {resolve} from 'path'
import {writeFileSync} from "fs";

export default function reference(type: any, opts: any) {
    const prebuiltgrammar: Grammar = Grammar.fromCompiled(require('../../nearley-prebuilt/nearley-language-bootstrapped'));
    const prebuiltparser: Parser = new Parser(prebuiltgrammar);

    if(type === "1") {
        prebuiltparser.feed('root -> ("hi":?|"bye":*)');
    } else if(type === "2") {
        prebuiltparser.feed('root -> ("hi":?|"bye":*) {% d => ("hi or bye") %}');
    }

    if(opts.out && opts.prettify) {
        writeFileSync(resolve(process.cwd(), opts.out), JSON.stringify(prebuiltparser.results, null, 2));
    } else if(opts.out && !opts.prettify) {
        writeFileSync(resolve(process.cwd(), opts.out), JSON.stringify(prebuiltparser.results));
    } else if(opts.prettify) {
        console.log(JSON.stringify(prebuiltparser.results, null, 2));
    } else {
        console.log(JSON.stringify(prebuiltparser.results));
    }
}
