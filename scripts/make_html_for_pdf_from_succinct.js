import fse from 'fs-extra';
import path from 'path';
import appRootPath from "app-root-path";
const appRoot = appRootPath.toString();
import {doRender} from '../index.js';

import {UWProskomma} from 'uw-proskomma';

if (process.argv.length !== 5) {
    throw new Error("USAGE: node make_html_for_pdf_from_succinct.js <succinctPath> <configPath> <htmlOutputPath>");
}
const succinctPath = path.resolve(process.argv[2]);
const succinct = fse.readJsonSync(succinctPath);
const configPath = path.resolve(appRoot, process.argv[3]);
const config = fse.readJsonSync(configPath);
config.codeRoot = appRoot;
config.configRoot = path.dirname(configPath);
config.outputPath = path.resolve(process.argv[4]);
if (!config.outputPath) {
    throw new Error("USAGE: node make_html_for_pdf_from_succinct.js <succinctPath> <configPath> <htmlOutputPath>");
}
config.bookOutput = {};
const pk = new UWProskomma();
pk.loadSuccinctDocSet(succinct);
const config2 = await doRender(pk, config, [], ["ODAzMjJmMTgt"]);
fse.writeFileSync(config2.outputPath, config2.output);
console.log(`HTML written to: ${path.resolve(config2.outputPath)}. View in a browser to see how PagedJS renders this.`)
