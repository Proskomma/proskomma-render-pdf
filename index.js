import {ScriptureParaModel, ScriptureParaModelQuery} from "proskomma-render";
import MainDocSet from "./MainDocSet.js";

const doRender = async (pk, config, docSetIds, documentIds) => {
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

export {doRender}
