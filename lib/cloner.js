{
    let glob = require("glob"),
        fs = require("fs"),
        path = require("path");


    const idXmlRegEx = new RegExp("<sys_id>([0-9a-f]{32})</sys_id>", 'gi');
    const fileNameRegEx = new RegExp("_([0-9a-f]{32}).xml$", "i");

    /**
     * Creates a calculated sys_id based on a namespace hash of the original sys_id.
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
     * @param {string} [pathGlob]
     * @return {array} file paths.
     * @example
     * let globPattern = "parent/**"+"/*.xml" ; // Stay in the comment for the example.
     * let xml_files = getFilesFromGlob(globPattern); => [ "parent/.../asdfsdfsa.xml", ... ]
     */
    let getFilesFromGlob = (pathGlob) => {
        return glob.globSync(pathGlob, {
            absolute: false,
            mark: true,
            ignore: ['**/node_modules/**', '**/.git/**']
        });

    };


    /**
     * Returns sys_ids found in files
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
     * @param {string} [pathGlob] a glob that gets expanded to matching files
     * @returns {array} sys_ids found in files and filenames identified in pathGlob expansion.
     * @example
     * let globPattern = "parent/**"+"/*.xml" ; // Stay in the comment for the example.
     * let ids = getIdsFromGlobPath(pathGlob) ; => ['deadbeefdeadbeef0123456789abcdef', ... ]
     */
    let getIdsFromGlobPath = (pathGlob) => {
        return getIdsFromFiles(getFilesFromGlob(pathGlob));
    };

    class CloneUtil {
        #clone_scope_name;
        #parent_repo_path;
        #parent_scope_name;
        #id_map;
        /**
         * @param {string} clone_scope_name x_prfx will be determined from parent if left off.
         * @param {string} [parent_repo_path=./parent]
         * @param {boolean} [verbose]
         */
        constructor(clone_scope_name, parent_repo_path = "./parent") {
            if (typeof clone_scope_name != "string" && clone_scope_name.length < 11) {
                throw new Error("clone_scope_path must be specified");
            }

            this.#parent_repo_path = parent_repo_path;
            if (!fs.existsSync(this.parent_repo_path)) {
                throw new Error("Parent path must exist");
            }
            if (clone_scope_name.indexOf("x_") == 0)
                this.#clone_scope_name = clone_scope_name;
            else {
                let customer_prefix = "x_"+this.parent_scope_name.split("_")[1];
                this.#clone_scope_name = customer_prefix + "_" + clone_scope_name;
            }
            if (!fs.existsSync(this.clone_path)) {
                this.initializeClone();
            }
            if (!fs.existsSync(this.id_map_file)) {
                this.#id_map = {};
                this.updateIdMapFromParent();
            } else {
                this.#id_map = require(path.resolve(this.id_map_file));
                this.updateIdMapFromParent();
                this.updateIdMapFromChild();
            }
            this.saveIdMap();
        }

        initializeClone() {
            fs.mkdirSync(this.clone_path);
            fs.mkdirSync(this.clone_app_xml_path);
            fs.writeFileSync("./sn_source_control.properties", "path=" + this.#clone_scope_name + "/app_xml\n");
        }
        updateIdMapFromParent() {
            getIdsFromGlobPath(this.parent_repo_path + "/**/*.xml")
                .forEach((id) => {
                    if (!(id in this.#id_map)) this.#id_map[id] = calculateGUID(this.#clone_scope_name, id);
                });
        }
        updateIdMapFromChild() {
            let seen = Object.values(this.#id_map);
            getIdsFromGlobPath(this.clone_app_xml_path + "/**/*.xml")
                .forEach((id) => {
                    if (seen.indexOf(id) == -1) this.#id_map[calculateGUID(this.parent_scope_name, id)]=id;
                });
        }
        saveIdMap() {
            fs.writeFileSync(this.id_map_file, JSON.stringify(this.#id_map, null, 1));
        }
        /**
         * Path to parent repo
         * @member {string}
         */
        get parent_repo_path() {
            return path.resolve(this.#parent_repo_path);
        }
        /**
         * Path to clone 
         * @member {string}
         */
        get clone_path() {
            return path.resolve("./" + this.clone_scope_short_name);
        }
        get clone_scope_name(){
          return this.#clone_scope_name;
        }
        get clone_scope_short_name(){
           let name_parts = this.clone_scope_name.split("_");
           name_parts.shift();
           name_parts.shift();
           return name_parts.join("_");
        }
        get clone_app_xml_path() {
            return this.clone_path + "/app_xml";
        }
        get id_map_file() {
            return this.clone_path + "/sys_id_map.json";
        }
        get parent_app_file() {
            return getFilesFromGlob(this.parent_repo_path + "/**/sys_app_*.xml").filter(x => x.match(/sys_app_[0-9a-fA-F]{32}\.xml$/)).shift();
        }
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
        get parent_app_xml_path(){
          return path.dirname(this.parent_app_file);
        }
        mungeParentToChild(){
          let parent_files = getFilesFromGlob(this.parent_app_xml_path+"/**/*");
          let i,content,new_filename;
          for (i=0;i<parent_files.length;i++){
            new_filename = this.mungeString(parent_files[i]);
            if (new_filename.endsWith("/")) {
              if (!fs.existsSync(new_filename)){
                fs.mkdirSync(new_filename,{recursive:true});
              }
            } else if (
              new_filename.endsWith('sn_source_control.properties') ||
              new_filename.endsWith('checksum.txt')
            ) {
              continue;
            } else {
              content = fs.readFileSync(parent_files[i], 'utf8').toString();
              fs.writeFileSync(new_filename,this.mungeString(content));
            }
          }
        }
        mergeChildToParent(){
          let child_files = getFilesFromGlob(this.clone_app_xml_path+"/**/*");
          let i,content,new_filename;
          for (i=0;i<child_files.length;i++){
            new_filename = this.mungeString(child_files[i],true);
            if (new_filename.endsWith("/")) {
              if (!fs.existsSync(new_filename)){
                fs.mkdirSync(new_filename,{recursive:true});
              }
            } else if (
              new_filename.endsWith('sn_source_control.properties') ||
              new_filename.endsWith('checksum.txt')
            ) {
              continue;
            } else {
              //console.log("%s -> %s", child_files[i], new_filename);
              content = fs.readFileSync(child_files[i], 'utf8').toString();
              fs.writeFileSync(new_filename,this.mungeString(content,true));
            }
          }
        }
        mungeString(string_in,reverse){
          let r = String(string_in);
          let from ;
          let to ;
          let i,reg;
          if (!reverse){
             reg = new RegExp(this.parent_scope_name,'g');
             r = r.replace(this.parent_app_xml_path,this.clone_app_xml_path)
                  .replace(reg,this.clone_scope_name);
             from = Object.keys(this.#id_map);
             to = Object.values(this.#id_map);
          } else {
             reg = new RegExp(this.clone_scope_name,'g');
             r = r.replace(this.clone_app_xml_path,this.parent_app_xml_path)
                  .replace(reg,this.parent_scope_name);
             to = Object.keys(this.#id_map);
             from = Object.values(this.#id_map);
          }
          for (i=0;i<from.length;i++){
             reg = new RegExp(from[i],'g');
             r = r.replace(reg,to[i]); 
          }
          return r;
        }
    }

    exports.getFilesFromGlob = getFilesFromGlob;
    exports.getIdsFromFiles = getIdsFromFiles;
    exports.getIdsFromGlobPath = getIdsFromGlobPath;
    exports.CloneUtil = CloneUtil;
    exports.generateGUID = calculateGUID;
}
