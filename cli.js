#!/usr/bin/env node
/* eslint no-process-exit:off */
const nopt = require("nopt"),
      fs = require("fs"),
      path = require("path"),
      CloneUtil = require(".").CloneUtil,
      knownOpts = {
          "parentPath": String,
          "cloneScope": String,
          "help": Boolean,
          "version": Boolean,
          "action": ["clone","merge"]
      },
    shortHands = {
        "p": ['--parentPath'],
        "s": ['--cloneScope'],
        "h": ["--help"],
        "?": ["--help"],
        "v": ["--version"],
        "c": ["--action","clone"],
        "m": ["--action","merge"]
    };
    nopt.invalidHandler = function(key, val) {
        throw new Error(key + " was invalid with value \"" + val + "\"");
    };

function usage(err){
    let scriptName = path.posix.basename(process.argv[1]),
        version = require('./package.json').version;
    let msg = [
        scriptName + '@' + version,
        '',
        'CLI OPTIONS:',
        '  -p, --parentPath=[./parent]  Path to parent app we clone from.',
        '  -s, --cloneScope  Scope name for cloned app.',
        '  --action [clone|merge] Clone from parent or merge to parent.',
        '  -m  Shorthand for --action merge',
        '  -c  Shorthand for --action clone',
        '  -h, --help       Show this help',
        '  -v, --version   Show package version'
    ];
    /* eslint-disable no-console */
    if (err) {
        msg.push(err);
        msg.push('');
        console.error(msg.join('\n'));
    } else {
        console.log(msg.join('\n'));
    }
    /* eslint-enable */
}

async function interpret(argv,slice){
    let parsed,cloner,parent_path;
    try {
        parsed = nopt(knownOpts, shortHands, argv, slice);
    } catch (ex) {
        usage(ex);
        process.exit(1); // eslint-disable-line no-process-exit
    }
    if (parsed.version) {
        console.log(require('./package.json').version); // eslint-disable-line no-console
        process.exit(0);
    } else if (parsed.help) {
        usage();
        process.exit(0);
    }
    if (!parsed.cloneScope){
        usage("--cloneScope is a required argument");
        process.exit(2); // eslint-disable-line no-process-exit
    }
    if (!parsed.action){
        usage("--action is a required argument");
        process.exit(2); // eslint-disable-line no-process-exit
    }
    parent_path = (parsed.parentPath) ? parsed.parentPath : "parent";
    if (!fs.existsSync(parent_path)) { 
        usage("--parentPath must refer to an existing path");
        process.exit(3);// eslint-disable-line no-process-exit
    }

    cloner = new CloneUtil(parsed.cloneScope,parent_path);
    if (parsed.action == "clone")
        await cloner.mungeParentToChild();
    else if (parsed.action == "merge")
        await cloner.mergeChildToParent();
}

// interpret args immediately when called as executable
if (require.main === module) {
    interpret();
}

exports.interpret = interpret;
