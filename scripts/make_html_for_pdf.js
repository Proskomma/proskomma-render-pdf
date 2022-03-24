import fse from 'fs-extra';
import path from 'path';
import appRootPath from "app-root-path";
const appRoot = appRootPath.toString();
import {doRender} from '../index.js';

import {Proskomma} from 'proskomma';

const bookMatches = str => {
    for (const book of config.bookSources) {
        if (str.includes(book) || str.includes(book.toLowerCase())) {
            return true;
        }
    }
    return false;
}

const peripheralMatches = str => {
    for (const periph of config.peripheralSources) {
        if (str.includes(periph) || str.includes(periph.toLowerCase())) {
            return true;
        }
    }
    return false;
}

if (process.argv.length !== 4) {
    throw new Error("USAGE: node make_pdf.js <configPath> <htmlOutputPath>");
}

const configPath = path.resolve(appRoot, process.argv[2]);
const config = fse.readJsonSync(configPath);
config.codeRoot = appRoot;
config.configRoot = path.dirname(configPath);
config.outputPath = path.resolve(process.argv[3]);
if (!config.outputPath) {
    throw new Error("USAGE: node make_html_for_pdf.js <configPath> <htmlOutputPath>");
}
config.bookOutput = {};

let ts = Date.now();
let nBooks = 0;
let nPeriphs = 0;

const pk = new Proskomma();
const fqSourceDir = path.resolve(config.configRoot, config.sourceDir);
for (const filePath of fse.readdirSync(fqSourceDir)) {
    if (bookMatches(filePath)) {
        console.log(`   ${filePath} (book)`);
        nBooks++;
        const content = fse.readFileSync(path.join(fqSourceDir, filePath));
        const contentType = filePath.split('.').pop();
        pk.importDocument(
            {lang: "xxx", abbr: "yyy"},
            contentType,
            content,
            {}
        );
    } else if (peripheralMatches(filePath)) {
        console.log(`   ${filePath} (peripheral)`);
        nPeriphs++;
        let content = fse.readFileSync(path.join(fqSourceDir, filePath));
        pk.importUsfmPeriph(
            { lang: 'xxx', abbr: 'yyy' },
            content,
            {},
        );
    }
}
console.log(`${nBooks} book(s) and ${nPeriphs} peripheral(s) loaded in ${(Date.now() - ts) / 1000} sec`);
ts = Date.now();

const config2 = await doRender(pk, config);
fse.writeFileSync(config2.outputPath, config2.output);
console.log(`HTML written to: ${path.resolve(config2.outputPath)}. View in a browser to see how PagedJS renders this.`)
