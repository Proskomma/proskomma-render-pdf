import {ScriptureParaModel, ScriptureParaModelQuery} from "proskomma-render";
import MainDocSet from "./MainDocSet.js";

const configIssues = config => {
    const checkStructure = (structure) => {
        let ret = [];
        for (const el of structure) {
            if (el[0] === 'bookCode') {
                const re = new RegExp('^[A-Z0-9]{3}$');
                if (!re.test(el[1])) {
                    ret.push(`bookCode '${el[1]}' in structure is not valid`);
                }
            } else {
                if (!(el[1] in config.i18n)) {
                    ret.push(`No i18n for section '${el[1]}' in structure`);
                }
                checkStructure(el[2]).forEach(e => ret.push(e));
            }
        }
        return ret;
    }
    const ret = checkStructure(config.structure);

    return ret;
}

const doRender = async (pk, config, docSetIds, documentIds) => {
    const configErrors = configIssues(config);
    if (configErrors.length > 0) {
        throw new Error(`Config Issues: ${configErrors.join('; ')}`);
    }
    let ts = Date.now();
    const doMainRender = (config, result) => {
        const model = new ScriptureParaModel(result, config);
        model.addDocSetModel('default', new MainDocSet(result, model.context, config));
        model.render();
        console.log(`Main rendered in  ${(Date.now() - ts) / 1000} sec`);
        console.log(model.logString());
    }
    const thenFunction = result => {
        console.log(`Query processed in  ${(Date.now() - ts) / 1000} sec`);
        ts = Date.now();
        doMainRender(config, result);
        return config;
    }
    const result = await ScriptureParaModelQuery(pk, docSetIds || [], documentIds || []);
    return thenFunction(result);
};

export {doRender, configIssues}
