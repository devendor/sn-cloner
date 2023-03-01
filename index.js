{
    const pckg = require("./package.json");
    exports.version = pckg.version;
    exports.name = pckg.name;
    const cloner = require("./lib/cloner.js");
    exports.getFilesFromGlob = cloner.getFilesFromGlob;
    exports.getIdsFromFiles = cloner.getIdsFromFiles ;
    exports.getIdsFromGlobPath = cloner.getIdsFromGlobPath ;
    exports.CloneUtil = cloner.CloneUtil ;
    exports.calculateGUID = cloner.calculateGUID;
}
