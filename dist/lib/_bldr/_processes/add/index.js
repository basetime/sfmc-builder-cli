"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Add = void 0;
const sfmcContext = require('@basetime/bldr-sfmc-sdk/dist/sfmc/utils/sfmcContextMapping');
const { MappingByAssetType } = require('@basetime/bldr-sfmc-sdk/dist/sfmc/utils/contentBuilderAssetTypes');
const getFiles = require('node-recursive-directory');
const promises_1 = require("fs/promises");
const lodash_remove_1 = __importDefault(require("lodash.remove"));
const yargs_interactive_1 = __importDefault(require("yargs-interactive"));
const display_1 = require("../../../_utils/display");
const fileSystem_1 = require("../../../_utils/fileSystem");
const _utils_1 = require("../../_utils");
const stash_1 = require("../stash");
const state_1 = require("../state");
const path_1 = __importDefault(require("path"));
const bldrFileSystem_1 = require("../../../_utils/bldrFileSystem");
const { getState, debug } = new state_1.State();
const { saveStash, displayStashStatus } = new stash_1.Stash();
/**
 * Handles all Configuration commands
 * @property {object} coreConfiguration
 * @property {object} stateConfiguration
 */
class Add {
    constructor() {
        /**
         * Handles all file functionality
         * Works with Stash backend file
         *
         * @param {object} argv user input including command and array of file paths to add to Stash
         */
        this.addFiles = (argv) => __awaiter(this, void 0, void 0, function* () {
            try {
                const stateObject = getState();
                const instance = stateObject && stateObject.instance;
                // Get the root directory for the project being worked on
                const rootPath = bldrFileSystem_1.normalizedRoot;
                // Get the current working directory that the [add] command was triggered
                const cwdPath = process.cwd();
                // Get Arguments Array
                const argvArr = argv._ || [];
                // Remove command from input array leaving only file names
                argvArr.shift();
                // Store all complete file paths for files in CWD and subdirectories
                let contextFiles = [];
                // Compile full folder paths based on CWD path and user provided paths
                for (const a in argvArr) {
                    const normalizedPath = path_1.default.normalize(argvArr[a]);
                    contextFiles.push(path_1.default.join(cwdPath, normalizedPath));
                }
                // Gather all file content/details for each file path
                // Separate out existing files and newly created files
                // Add existing files to the Stash with the updated file content
                const organizedFiles = yield this.gatherAllFiles(contextFiles, rootPath);
                const { putFiles, postFiles, postFileOptions } = organizedFiles;
                putFiles && putFiles.length && (yield saveStash(putFiles));
                yield this.buildNewAssetObjects({
                    postFileOptions,
                    postFiles,
                    instance,
                    rootPath,
                });
                yield displayStashStatus();
            }
            catch (err) {
                console.log(err);
            }
        });
        /**
         * Method to gather all files in CWD and add to the temp Stash
         * Prepares JSON for POST/PUT to SFMC APIs
         * Will add all files starting at the CWD request was made, including all files in subfolders
         */
        this.addAllFiles = (packageManifestJSON = null) => __awaiter(this, void 0, void 0, function* () {
            try {
                const stateObject = getState();
                const instance = stateObject && stateObject.instance;
                // Get the root directory for the project being worked on
                const rootPath = bldrFileSystem_1.normalizedRoot;
                // Get the current working directory that the [add] command was triggered
                const cwdPath = process.cwd();
                debug('Folder Path', 'info', { cwdPath, rootPath });
                // Identify the context for request
                const contextsArray = sfmcContext.sfmc_context_mapping.map((context) => context.name);
                // Store all complete file paths for files in CWD and subdirectories
                let contextFiles = [];
                // get files from current working directory and subdirectories
                contextFiles.push(...(yield getFiles(path_1.default.resolve('./'))));
                const filteredContextFiles = contextFiles
                    .map((filePath) => {
                    const isContextFilePath = contextsArray.some((context) => {
                        return filePath.includes(context);
                    });
                    return (isContextFilePath && filePath) || '';
                })
                    .filter(Boolean);
                // Gather all file content/details for each file path
                // Separate out existing files and newly created files
                // Add existing files to the Stash with the updated file content
                if (!packageManifestJSON) {
                    const organizedFiles = yield this.gatherAllFiles(filteredContextFiles, rootPath);
                    debug('organizedFiles', 'info', organizedFiles);
                    const { putFiles, postFiles, postFileOptions } = organizedFiles;
                    putFiles && putFiles.length && (yield saveStash(putFiles));
                    yield this.buildNewAssetObjects({
                        postFileOptions,
                        postFiles,
                        instance,
                        rootPath,
                    });
                }
                else {
                    const organizedFiles = yield this.gatherAllFilesFromPackage(contextFiles);
                    debug('organizedFiles in else', 'info', organizedFiles);
                    const { postFiles } = organizedFiles;
                    postFiles && postFiles.length && (yield saveStash(postFiles));
                }
                yield displayStashStatus();
            }
            catch (err) {
                console.log(err);
            }
        });
        /**
         *
         * @param contextFiles
         * @param rootPath
         */
        this.gatherAllFiles = (contextFiles, rootPath2) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const putFiles = [];
            // Store all complete objects for Stash
            const postFiles = [];
            const rootPath = (yield (0, fileSystem_1.getRootPath)()) || path_1.default.normalize('./');
            // Get manifest JSON file
            const manifestPath = path_1.default.join(rootPath, '.local.manifest.json');
            // Read ManifestJSON file from root dir
            const manifestFile = yield (0, promises_1.readFile)(manifestPath);
            const manifestJSON = JSON.parse(manifestFile);
            // Initiate configuration for new file prompts
            let postFileOptions = {};
            // Get all available contexts to check for files
            const availableContexts = contextFiles.map((filePath) => {
                const { context } = (0, _utils_1.getFilePathDetails)(path_1.default.normalize(filePath));
                return filePath.includes(context.name) && context;
            });
            debug('availableContexts', 'info', availableContexts);
            for (const context in availableContexts) {
                const folderNameRegex = new RegExp('[\\\\/]+' + availableContexts[context].name + '[\\\\/]+', 'i');
                const contextPaths = contextFiles.filter((file) => folderNameRegex.test(file));
                const bldrContext = availableContexts[context].context;
                const manifestContextAssets = manifestJSON[bldrContext] && manifestJSON[bldrContext]['assets'];
                debug('manifestContextAssets', 'info', manifestContextAssets);
                // If the Manifest JSON file has an assets Array process files
                if (manifestContextAssets) {
                    // Iterate through files array to check if existing files
                    for (const path in contextPaths) {
                        const systemFilePath = contextPaths[path];
                        debug('systemFilePath', 'info', systemFilePath || 'nothing here');
                        // Check Manifest assets if the file path exists
                        // Gets folder path from the manifest asset
                        // Splits system file path into an array
                        // Gets the asset name from the system file path
                        // Tests if the system file path includes the folder path of the current asset
                        // Tests if the system file name is the same as the assets name
                        const existingAsset = manifestContextAssets.find((asset) => {
                            const { name, formattedDir } = (0, _utils_1.getFilePathDetails)(systemFilePath);
                            return formattedDir.endsWith(asset.category.folderPath) && name === asset.name && asset;
                        });
                        if (existingAsset) {
                            const fileContentRaw = yield (0, promises_1.readFile)(systemFilePath);
                            const fileContent = fileContentRaw.toString();
                            debug('existing - fileContentRaw', 'info', fileContentRaw || 'nothing here');
                            const objectIdKey = (_a = existingAsset.assetType) === null || _a === void 0 ? void 0 : _a.objectIdKey;
                            const existingSchema = {
                                path: systemFilePath,
                                bldr: {
                                    context: availableContexts[context],
                                    bldrId: existingAsset.bldrId,
                                    folderPath: existingAsset.category && existingAsset.category.folderPath,
                                },
                                fileContent,
                            };
                            if (existingAsset.id) {
                                existingSchema.bldr.id = existingAsset.id;
                            }
                            else if (objectIdKey) {
                                existingSchema.bldr.id = existingAsset[objectIdKey];
                            }
                            // If the file exists build the stash object for a put request
                            putFiles.push(existingSchema);
                            // Once stash file is processed remove the filepath from items waiting for processing
                            (0, lodash_remove_1.default)(contextFiles, (contextFilePath) => contextFilePath === systemFilePath);
                        }
                        else {
                            // If the file does not exist build the stash object for a post request
                            // Also Build the options for CLI prompt
                            const bldrId = yield (0, _utils_1.guid)();
                            const { name, dirName, dir, formattedDir, projectDir } = yield (0, _utils_1.getFilePathDetails)(systemFilePath);
                            const fileContentRaw = yield (0, promises_1.readFile)(systemFilePath);
                            const fileContent = fileContentRaw.toString();
                            debug('new - fileContentRaw', 'info', fileContent || 'nothing here');
                            postFiles.push({
                                name: name,
                                path: systemFilePath,
                                bldr: {
                                    context: availableContexts[context],
                                    folderPath: projectDir,
                                    bldrId,
                                },
                                fileContent,
                            });
                            if (availableContexts[context]['context'] === 'contentBuilder') {
                                postFileOptions[bldrId] = {
                                    type: 'list',
                                    describe: `What type of asset is ${dirName}/${name}`,
                                    // choices: ['htmlemail', 'codesnippetblock', 'htmlblock'],
                                    choices: ['codesnippetblock'],
                                    prompt: 'always',
                                };
                            }
                            // Once stash file is processed remove the filepath from items waiting for processing
                            (0, lodash_remove_1.default)(contextFiles, (contextFilePath) => contextFilePath === systemFilePath);
                        }
                    }
                }
            }
            // Add interactive key to yargs-interactive object
            postFileOptions['interactive'] = {
                default: true,
            };
            return {
                postFileOptions,
                postFiles,
                putFiles,
            };
        });
        /**
         *
         * @param contextFiles
         * @param rootPath
         */
        this.gatherAllFilesFromPackage = (contextFiles) => __awaiter(this, void 0, void 0, function* () {
            // Store all complete objects for Stash
            const postFiles = [];
            const rootPath = (0, fileSystem_1.getRootPath)();
            // Get manifest JSON file
            const packagePath = rootPath ? `${rootPath}package.manifest.json` : `./package.manifest.json`;
            // Read ManifestJSON file from root dir
            const packageFile = yield (0, promises_1.readFile)(packagePath);
            const packageJSON = JSON.parse(packageFile);
            // Get all available contexts to check for files
            const availableContexts = contextFiles.map((filePath) => {
                const { context } = (0, _utils_1.getFilePathDetails)(filePath);
                return filePath.includes(context.name) && context;
            });
            for (const context in availableContexts) {
                const contextPaths = contextFiles.filter((file) => file.includes(availableContexts[context].name));
                const bldrContext = availableContexts[context].context;
                const manifestContextAssets = packageJSON[bldrContext] && packageJSON[bldrContext]['assets'];
                // If the Manifest JSON file has an assets Array process files
                if (manifestContextAssets) {
                    // Iterate through files array to check if existing files
                    for (const path in contextPaths) {
                        const systemFilePath = contextPaths[path];
                        const { name, dirName } = (0, _utils_1.getFilePathDetails)(systemFilePath);
                        // Check Manifest assets if the file path exists
                        // Gets folder path from the manifest asset
                        // Splits system file path into an array
                        // Gets the asset name from the system file path
                        // Tests if the system file path includes the folder path of the current asset
                        // Tests if the system file name is the same as the assets name
                        const packageAsset = manifestContextAssets.find((asset) => {
                            const { name, formattedDir } = (0, _utils_1.getFilePathDetails)(systemFilePath);
                            return formattedDir.endsWith(asset.category.folderPath) && name === asset.name && asset;
                        });
                        const fileContentRaw = yield (0, promises_1.readFile)(systemFilePath);
                        const fileContent = fileContentRaw.toString();
                        const existingSchema = {
                            name: name,
                            path: systemFilePath,
                            bldr: {
                                context: availableContexts[context],
                                bldrId: packageAsset.bldrId,
                                folderPath: packageAsset.category && packageAsset.category.folderPath,
                            },
                            fileContent,
                            assetType: packageAsset.assetType,
                        };
                        // If the file exists build the stash object for a put request
                        postFiles.push(existingSchema);
                        // Once stash file is processed remove the filepath from items waiting for processing
                        (0, lodash_remove_1.default)(contextFiles, (contextFilePath) => contextFilePath === systemFilePath);
                    }
                }
            }
            return {
                postFiles,
            };
        });
        /**
         * Method to configure all new folders for SFMC API POST
         *
         * @param {object} postFileOptions configuration options for all file prompts
         * @param {object} postFiles array of new files objects to post
         * @param {string} instance current instance to stave to stash
         * @param {string} dirPath project directory path
         * @returns user prompts for configuration
         */
        this.buildNewAssetObjects = (request) => __awaiter(this, void 0, void 0, function* () {
            const options = request && request.postFileOptions;
            return (0, yargs_interactive_1.default)()
                .usage('$0 <command> [args]')
                .interactive(options)
                .then((optionsResult) => __awaiter(this, void 0, void 0, function* () {
                try {
                    // Iterate through all configured file objects for post
                    for (const resultBldrId in optionsResult) {
                        // Get post file based on key matching bldrId
                        const postFile = request.postFiles.find((fileObject) => fileObject.bldr.bldrId === resultBldrId);
                        if (postFile) {
                            // Get Asset Type from user input
                            if (optionsResult[resultBldrId]) {
                                postFile.assetType = MappingByAssetType(optionsResult[resultBldrId]);
                            }
                            yield saveStash(postFile);
                        }
                    }
                    const noOptionFiles = request.postFiles.filter((noOptionPost) => !Object.keys(optionsResult).includes(noOptionPost.bldr.bldrId));
                    for (const noOpt in noOptionFiles) {
                        const postFile = noOptionFiles[noOpt];
                        yield saveStash(postFile);
                    }
                }
                catch (err) {
                    (0, display_1.displayLine)(`Create Asset Error: ${err.message}`);
                }
            }));
        });
    }
}
exports.Add = Add;
