/**
 * Modular cloner/merger for service-now scoped application repositories.
 * @module {object} sn-cloner
 * @example <caption>create new clone repo in current working directory</caption>
 * {
 *    const CloneUtil = require("@devendor/sn-cloner").CloneUtil;
 *     new CloneUtil('x_mydev_needit','../devtraining-needit-tokyo')
 *       .mungeParentToChild(); // -> {Promise}
 * }
 *
 * @example <caption>invoking the cli with npx</caption>
 * rfergu$ npx @devendor/sn-cloner
 * npx: installed 12 in 2.479s
 * sn-cloner@1.0.8
 *  
 * CLI OPTIONS:
 *  -p, --parentPath=[./parent]  Path to parent app we clone from.
 *  -s, --cloneScope  Scope name for cloned app.
 *  --action [clone|merge] Clone from parent or merge to parent.
 *  -m  Shorthand for --action merge
 *  -c  Shorthand for --action clone
 *  -h, --help       Show this help
 *  -v, --version   Show package version
 *  --cloneScope is a required argument
 * 
 * @example <caption>installed locally</caption>
 * rfergu$ npm install @devendor/sn-cloner --save-dev
 * # ...  installs here
 * rfergu$ ./node_modules/.bin/sn-cloner
 * sn-cloner@1.0.8
 * # usage ... 
 *
 * @example <caption>create a new repo from parent repo in new scoped namespace</caption>
 * rfergu$ sn-cloner -p ../parent_app_repo -s x_george_cloney -c
 * rfergu$ ls
 *   sn_source_control.properties x_george_cloney/... x_george_cloney_idmap.json
 * rfergu$ git init .
 * rfergu$ git branch -M main
 * rfergu$ git add .
 * rfergu$ git commit -m "George Cloney is just like his dad."
 * # add a repo to push too first.
 * rfergu$ git remote add git@github.com:youraccount/george-cloney.git
 * rfergu$ git push origin main
 * # Now you can install george-cloney on you instance with a git pull
 * # and it can live right next to the parent app on the same instance!
 * 
 *
 * @example <caption>merge a cloned repo's changes back into the parent app repo</caption>
 * rfergu$ sn-cloner -p ../parent_app_repo -s x_george_cloney -m
 * rfergu$ cd ../parent_app_repo
 * rfergu$ git diff --stat
 * # you should see the incrimental updates merged / marked modified in but not ready for commit
 * rfergu$ git checkout --branch georgeCloney # not strictly needed, but probably a good idea
 * rfergu$ git add . 
 * rfergu$ git commit -m "George Cloney is home to do laundry."
 * rfergu$ git push origin --all
 * # something about new branch georgeCloney. At this point you can pull the changes
 * # back into the parent app and test them, merge it back to main, or
 * # whatever you decide is right for your release process.
 */


{
    const pckg = require("./package.json");
    /** package.conf version string */
    exports.version = pckg.version;
    /** package.conf name */
    exports.name = pckg.name;
    const cloner = require("./lib/cloner.js");
    exports.getFilesFromGlob = cloner.getFilesFromGlob;
    exports.getIdsFromFiles = cloner.getIdsFromFiles ;
    exports.getIdsFromGlobPath = cloner.getIdsFromGlobPath ;
    exports.CloneUtil = cloner.CloneUtil ;
    exports.calculateGUID = cloner.calculateGUID;
}
