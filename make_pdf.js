import fse from 'fs-extra';
import path from 'path';
import appRootPath from "app-root-path";
const appRoot = appRootPath.toString();

import {Proskomma} from 'proskomma';
import {
    ScriptureParaModel,
    ScriptureParaModelQuery
} from 'proskomma-render';
import MainDocSet from './MainDocSet.js';

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

const doMainRender = (config, result) => {
    ts = Date.now();
    const model = new ScriptureParaModel(result, config);
    model.addDocSetModel('default', new MainDocSet(result, model.context, config));
    model.render();
    console.log(`Main rendered in  ${(Date.now() - ts) / 1000} sec`);
    console.log(model.logString());
}

const doRender = async (pk, config) => {
    const thenFunction = result => {
        console.log(`Query processed in  ${(Date.now() - ts) / 1000} sec`);
        doMainRender(config, result);
        fse.writeFileSync(config.outputPath, config.output);
    }
    await ScriptureParaModelQuery(pk)
        .then(thenFunction)
};

if (process.argv.length !== 4) {
    throw new Error("USAGE: node make_pdf.js <configPath> <htmlOutputPath>");
}

const configPath = path.resolve(appRoot, process.argv[2]);
const config = fse.readJsonSync(configPath);
config.codeRoot = appRoot;
config.configRoot = path.dirname(configPath);
config.outputPath = path.resolve(process.argv[3]);
if (!config.outputPath) {
    throw new Error("USAGE: node make_pdf.js <configPath> <htmlOutputPath>");
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

doRender(pk, config).then((res) => {
    // console.log(JSON.stringify(config, null, 2));
});
