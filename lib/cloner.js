{
    
    let glob = require("glob"),
        fs = require("fs"),
        path = require("path");


    const idXmlRegEx = new RegExp("<sys_id>([0-9a-f]{32})</sys_id>", 'gi');
    const fileNameRegEx = new RegExp("_([0-9a-f]{32})(?:.xml|_[^.]+.xml)$", "i");

    /**
     * Creates a calculated sys_id based on a namespace hash of the original sys_id.
     * @alias module:sn-cloner.calculateGUID
     * @param {string} scope_name 
     * @param {string} source_sys_id 
     * @returns {string} 
     */
    let calculateGUID = (scope_name, source_sys_id) => {
        const uuid = require('uuid').v5;
        return uuid(source_sys_id + "." + scope_name, uuid.DNS).replace(/-/g, '');
    };

    /**
     * Returns an array of filenames from expanded pathGlob
     * @alias module:sn-cloner.getFilesFromGlob
     * @param {string} [pathGlob]
     * @return {array} file paths.
     * @example
     * let globPattern = "parent/**"+"/*.xml" ; // Stay in the comment for the example.
     * let xml_files = getFilesFromGlob(globPattern); => [ "parent/.../asdfsdfsa.xml", ... ]
     */
    let getFilesFromGlob = (pathGlob) => {
        return glob.globSync(pathGlob, {
            absolute: true,
            mark: true,
            ignore: ['**/node_modules/**', '**/.git/**'],
            platform: 'linux'
        },);

    };


    /**
     * Returns sys_ids found in files
     * @alias module:sn-cloner.getIdsFromFiles
     * @param {array} [files] file paths.
     * @returns {array} unique sys_ids found in files and filenames.
     * @example
     * let globPattern = "parent/**"+"/*.xml" ; // Stay in the comment for the example.
     * let xml_files = getFilesFromGlob(globPattern); => [ "parent/.../asdfsdfsa.xml", ... ]
     * let ids = getIdsFromFiles(xml_files) ; => ['deadbeefdeadbeef0123456789abcdef', ... ]
     */
    let getIdsFromFiles = (files) => {
        let ids = [];
        files.forEach((file) => {
            let m, _data;
            _data = fs.readFileSync(file, 'utf8');
            /* eslint-disable no-cond-assign */
            if (m = fileNameRegEx.exec(file)) {
                if (ids.indexOf(m[1]) == -1) ids.push(m[1]);
            }
            while (m = idXmlRegEx.exec(_data)) {
                if (ids.indexOf(m[1]) == -1) ids.push(m[1]);
            }
            /* eslint-enable */
        });
        ids.sort();
        return ids;
    };

    /**
     * Return sys_ids found in files matching pathGlob
     * @alias module:sn-cloner.getIdsFromGlobPath
     * @param {string} [pathGlob] a glob that gets expanded to matching files
     * @returns {array} sys_ids found in files and filenames identified in pathGlob expansion.
     * @example
     * let globPattern = "parent/**"+"/*.xml" ; // Stay in the comment for the example.
     * let ids = getIdsFromGlobPath(pathGlob) ; => ['deadbeefdeadbeef0123456789abcdef', ... ]
     */
    let getIdsFromGlobPath = (pathGlob) => {
        return getIdsFromFiles(getFilesFromGlob(pathGlob));
    };
    /**
    * Will initialize a clone app repo in current working directory or
    * load an existing one.

    * Parent path must be a path to a git repo that
    * contains an sys_app_%sys_id%.xml file optionally in subdir as
    * indicate by path= in sn_source_control.properties.
    * 
    * Cloned repos will put app files in ./%clone_scope_name%/app_xml, create an appropriate
    * sn_source_control.properties file and replace the namespace (sys_app.scope)
    * and sys_ids for the app files so it can be loaded along side
    * the parent. IDs are a calculation based on the original sys_id
    * and are also tracked in an idmap within the cloned repo for re-merge.
    *
    * @class 
    * @alias module:sn-cloner.CloneUtil
    * @no-default-init 
    * @param {string} clone_scope_name 
    * @param {string} [parent_repo_path=./parent]
    * @returns {CloneUtil}
    * @example
    * // note: Still expects unix fs symantics on Windows.
    * const CloneUtil = require('@sn-cloner').CloneUtil;
    * let cu = new CloneUtil('x_ray_needit','../devtraining-needit')
    * cu.parent_scope_name // -> "x_123980_needit" 
    */
    class CloneUtil {
        #clone_scope_name;
        #parent_repo_path;
        #parent_scope_name;
        #id_map;

        constructor(clone_scope_name, parent_repo_path = "./parent") {
            if (typeof clone_scope_name != "string" && clone_scope_name.length < 10) {
                throw new Error("clone_scope_path must be specified");
            }

            this.#parent_repo_path = parent_repo_path;
            if (!fs.existsSync(this.parent_repo_path)) {
                throw new Error("Parent path must exist : NOT_FOUND - "+this.parent_repo_path);
            }
            this.#clone_scope_name = String(clone_scope_name).toLowerCase().replace(/[^0-9a-z_]/g,"").slice(0, 18);
            if (!fs.existsSync(this.clone_path)) {
                this.initializeClone();
            }
            if (!fs.existsSync(this.id_map_file)) {
                this.#id_map = {};
                this.updateIdMapFromParent();
            } else {
                this.#id_map = require(path.posix.resolve(this.id_map_file));
                this.updateIdMapFromParent();
                this.updateIdMapFromChild();
            }
            this.saveIdMap();
        }

        /**
         * Called to initialize the clone directories and properties file on intialization when needed.
         * @return {CloneUtil}
         */
        initializeClone() {
            fs.mkdirSync(this.clone_path);
            fs.mkdirSync(this.clone_app_xml_path);
            fs.writeFileSync("./sn_source_control.properties", "path=" + this.clone_scope_name + "/app_xml\n");
            return this;
        }
        /**
         * Called on init to generate or update file://%this.id_map_file% and this.id_map object with
         * corresponding clone-scoped sys_ids for each one found in this.parent_app_xml_path
         * @returns {CloneUtil}
         */
        updateIdMapFromParent() {
            getIdsFromGlobPath(this.parent_repo_path + "/**/*.xml")
                .forEach((id) => {
                    if (!(id in this.#id_map)) this.#id_map[id] = calculateGUID(this.#clone_scope_name, id);
                });
            return this;
        }
        /**
         * Called on init to generate or update file://%this.id_map_file% and this.id_map object with
         * corresponding clone-scoped sys_ids for each one found in this.child_app_xml_path that lacks
         * a corresponding id for parent.
         * @returns {CloneUtil}
         */
        updateIdMapFromChild() {
            let seen = Object.values(this.#id_map);
            getIdsFromGlobPath(this.clone_app_xml_path + "/**/*.xml")
                .forEach((id) => {
                    if (seen.indexOf(id) == -1) this.#id_map[calculateGUID(this.parent_scope_name, id)] = id;
                });
            return this;
        }
        /**
         * Called on init to persist the updated this.id_map to file://%this.id_map_file%. 
         * Note: The values are calculated based on namespace so any given sys_id will 
         * create a consistent calculated sys_id essentially hashing in the scope name with
         * the original id.
         * @returns {CloneUtil}
         */
        saveIdMap() {
            fs.writeFileSync(this.id_map_file, JSON.stringify(this.#id_map, null, 1));
            return this;
        }
        /**
         * POSIX style path to parent repo.      
         * @member {string}
         * @example
         * new CloneUtil('x_foo_needit','../devtraining-needit').parent_repo_path // -> "/Users/rferguson/src/devtraining-needit"
         */
        get parent_repo_path() {
            return path.posix.resolve(this.#parent_repo_path);
        }
        /**
         * POSIX style path to clone destination. %CWD% + "/" + %clone_scope_name% 
         * @member {string}
         * @example
         * new CloneUtil('x_foo_needit','../devtraining-needit').clone_path // -> "/Users/rferguson/src/needit-clone/x_foo_needit"
         */
        get clone_path() {
            return path.posix.resolve("./" + this.clone_scope_name);
        }
        /**
         * name of the scope with illegal chars removed and truncated to 18 chars for compatibility.
         * @member {string}
         * @example
         * new CloneUtil('x_foo_need--...-it','../devtraining-needit').clone_scope_name // -> "x_foo_needit"
         */
        get clone_scope_name() {
            return this.#clone_scope_name;
        }
        /**
         * Just splits the x_ prefix off of this.clone_scope_name.
         * @member {string}
         * @example
         * new CloneUtil('x_foo_needit','../devtraining-needit').clone_scope_short_name // -> "foo_needit"
         */
        get clone_scope_short_name() {
            let name_parts = this.clone_scope_name.split("_");
            name_parts.shift();
            return name_parts.join("_");
        }
        /**
         * Path the the xml files that define the service-now app in the clone.
         * @member {string}
         * @example
         * new CloneUtil('x_foo_needit','../devtraining-needit').clone_app_xml_path // -> "/Users/rferguson/src/needit-clone/x_foo_needit/app_xml"
         */
        get clone_app_xml_path() {
            return this.clone_path + "/app_xml";
        }
        /**
         * Path the the json file used to persist sys_id mapping for the clone so we can re-merge to parent.
         * @member {string}
         * @example
         * new CloneUtil('x_foo_needit','../devtraining-needit').id_map_file // -> "/Users/rferguson/src/needit-clone/x_foo_needit_idmap.json"
         */
        get id_map_file() {
            return path.posix.resolve("./") + "/"+this.clone_scope_name+"_idmap.json";
        }
        /**
         * Path the the sys_app_%sys_id%.xml file for the parent app. This is used to parse out this.parent_scope_name for replacements.
         * @member {string}
         * @example
         * new CloneUtil('x_foo_needit','../devtraining-needit').parent_app_file // -> "/Users/rferguson/src/devtraining-needit/sys_app_0987654321...xml"
         */
        get parent_app_file() {
            return getFilesFromGlob(String(this.parent_repo_path) + "/**/sys_app_*.xml").filter(x => x.match(/sys_app_[0-9a-fA-F]{32}\.xml$/)).shift();
        }
        /**
         * parsed from this.parent_app_file. Throws if the file doesn't exist.
         * @member {string}
         */
        get parent_scope_name() {
            const scope_regex = RegExp('<scope[^<]*?>([^<]*)</scope>', 'g');
            if (!this.#parent_scope_name) {
                let xml_data = fs.readFileSync(this.parent_app_file, 'utf8');
                let m = scope_regex.exec(xml_data);
                if (m) {
                    this.#parent_scope_name = m[1];
                } else {
                    throw new Error("Unable to find sys_app_....xml:<scope> element");
                }
            }
            return this.#parent_scope_name;
        }
        /**
         * Where the sn_source_control.properties points to for the xml files. 
         * @member {string}
         * @example
         * new CloneUtil('x_foo_needit','../devtraining-needit').parent_app_xml_path // -> "/Users/rferguson/src/needit-clone/"
         */
        get parent_app_xml_path() {
            return path.posix.resolve(path.dirname(this.parent_app_file));
        }

        /**
         * Called to merge changes from the clone back into the parent.
         * Note: We expect this.parent_app_repo to be set at the commit we cloned from.
         * @returns {Promise}
         * @example
         * new CloneUtil('x_foo_needit','../devtraining-needit').mungeParentToChild();
         * // you should have an app repo your and push then checkout right in %CWD% now!
         */
        async mungeParentToChild() {
            let parent_files = getFilesFromGlob(this.parent_app_xml_path + "/**/*");
            let i; 
            let promises = [];
            await this.removeAllXml(this.clone_app_xml_path);
            for (i = 0; i < parent_files.length; i++) {
                let new_filename, p, pp;
                new_filename = this.mungeString(parent_files[i]);
                if (new_filename.endsWith("/")) {
                    if (!fs.existsSync(new_filename)) {
                        fs.mkdirSync(new_filename, { recursive: true });
                    }
                } else if (
                    new_filename.endsWith('sn_source_control.properties') ||
                    new_filename.endsWith('checksum.txt')
                ) {
                    continue;
                } else {
                    p = fs.readFile(
                        path.posix.resolve(parent_files[i]),
                        { encoding: 'utf8' },
                        (err, data) => {
                            if (err) throw err;
                            pp = fs.writeFile(
                                new_filename,
                                this.mungeString(String(data)), { encoding: "utf8" },
                                (err) => { if (err) throw err; }
                            );
                            promises.push(pp);
                        } // end callback
                    );
                    promises.push(p);
                }
            }
            await Promise.all(promises);
        }

        /**
         * Called to merge changes from the clone back into the parent.
         * Note: We expect this.parent_app_repo to be set at the commit we cloned from.
         * @returns {Promise}
         * @example
         * new CloneUtil('x_foo_needit','../devtraining-needit').mungeChildToParent()
         * // cd ../devtraing-needit  ; git diff --stat // -> you will see the incremental changes from the child!
         */
        async mergeChildToParent() {
            let child_files = getFilesFromGlob(this.clone_app_xml_path + "/**/*");
            let i; 
            let promises = [];
            await this.removeAllXml(this.parent_app_xml_path);
            for (i = 0; i < child_files.length; i++) {
                let new_filename, p, pp;
                new_filename = this.mungeString(child_files[i], true);
                if (new_filename.endsWith("/")) {
                    if (!fs.existsSync(new_filename)) {
                        fs.mkdirSync(new_filename, { recursive: true });
                    }
                } else if (
                    new_filename.endsWith('sn_source_control.properties') ||
                    new_filename.endsWith('checksum.txt')
                ) {
                    continue;
                } else {
                    //console.log("%s -> %s", child_files[i], new_filename);
                    p = fs.readFile(
                        child_files[i], { encoding: 'utf8' },
                        (err, data) => {
                            if (err) throw err;
                            pp = fs.writeFile(
                                new_filename,
                                this.mungeString(String(data), true), { encoding: "utf8" },
                                (err) => { if (err) throw err; }
                            );
                            promises.push(pp);
                        } // end promises
                    );
                    promises.push(p);
                } //end else
            } // end for
            await Promise.all(promises);
            return this;
        }
        /**
         * Called by both mergeChildToParent and mungeParentToChild to remove all desination
         * xml files from either the destination parent or child respectively.
         *
         * We preserve this.parent_app_file since it is used for other attribute calculations
         * but everything else is removed and regenerated in the clone or merge process currently.
         * This is primarily needed to accomodate the deleted files. A delete of update/abc.xml
         * removes update/abc.xml and adds author_elective_update. Basically ./author_elective_updates/\*.xml
         * correspond to [sys_metadata_delete] "Deleted Application Files" while ./update/\*.xml
         * correspond to [sys_metadata] "Application Files"
         *
         * @param {string} basepath path to remove xml files from.
         * @returns {Promise}
         */
        async removeAllXml(basepath) {
            let remove_files;
            let promises = [];
            if (basepath == this.parent_app_xml_path || basepath == this.clone_app_xml_path) {
                remove_files = getFilesFromGlob(basepath + "/**/*.xml");
                for (let i = 0; i < remove_files.length; i++) {
                    if (remove_files[i] != this.parent_app_file)
                        promises.push(fs.rm(remove_files[i], {}, (err) => { if (err) throw err; }));
                }
            } else {
                throw new Error("This module only allows removeAllXml to exec on [parent|child]_app_xml_paths");
            }
            await Promise.all(promises);
            return this;
        }
        /**
         * Apply string replacements to sys_ids and scopes to change parent files
         * to child files for "clone" or the [reverse] to change child files back into
         * parent files for "merge".
         * @param {string} string_in
         * @param {Boolean} [reverse=false] set to true to mung a child string back to a parent string.
         */
        mungeString(string_in, reverse) {
            let r = String(string_in);
            let from;
            let to;
            if (!reverse) {
                if (r.includes(this.parent_app_xml_path)) {
                    let reg = new RegExp(this.parent_scope_name+"_", 'g');
                    r = r.replace(this.parent_app_xml_path, this.clone_app_xml_path);
                    r = r.replace(reg, this.clone_scope_name+"_");
                } else {
                    let reg = new RegExp(this.parent_scope_name, 'g');
                    r = r.replace(reg, this.clone_scope_name);
                }
                from = Object.keys(this.#id_map);
                to = Object.values(this.#id_map);
            } else {
                if (r.includes(this.clone_app_xml_path)) {
                    let reg = new RegExp(this.clone_scope_name+'_', 'g');
                    r = r.replace(this.clone_app_xml_path, this.parent_app_xml_path);
                    r = r.replace(reg, this.parent_scope_name+'_');
                } else {
                    let reg = new RegExp(this.clone_scope_name, 'g');
                    r = r.replace(reg, this.parent_scope_name);
                }
                to = Object.keys(this.#id_map);
                from = Object.values(this.#id_map);
            }
            for (let i = 0; i < from.length; i++) {
                let reg = new RegExp(from[i], 'g');
                r = r.replace(reg, to[i]);
            }
            return r;
        }
    }

    exports.getFilesFromGlob = getFilesFromGlob;
    exports.getIdsFromFiles = getIdsFromFiles;
    exports.getIdsFromGlobPath = getIdsFromGlobPath;
    exports.CloneUtil = CloneUtil;
    exports.generateGUID = calculateGUID;
    exports.calculateGUID;
}