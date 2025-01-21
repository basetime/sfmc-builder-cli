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
exports.Deploy = void 0;
const bldrFileSystem_1 = require("../../../_utils/bldrFileSystem");
const fileSystem_1 = require("../../../_utils/fileSystem");
const CreateFilesBasedOnContext_1 = require("../../../_utils/bldrFileSystem/_context/CreateFilesBasedOnContext");
const manifestJSON_1 = require("../../../_utils/bldrFileSystem/manifestJSON");
const bldrFileSystem_2 = require("../../../_utils/bldrFileSystem");
const CreateSFMCFolders_1 = require("../../_utils/CreateSFMCFolders");
const _bldr_sdk_1 = require("../../../_bldr_sdk");
const add_1 = require("../add");
const push_1 = require("../push");
const display_1 = require("../../../_utils/display");
const definitions_1 = require("../_contexts/contentBuilder/definitions");
const state_1 = require("../state");
const { isVerbose, allowTracking } = new state_1.State();
const packageDeployIgnore_1 = require("../../_utils/packageDeployIgnore");
const fs_1 = __importDefault(require("fs"));
const metrics_1 = require("../../../_utils/metrics");
const add = new add_1.Add();
const push = new push_1.Push();
const sfmcContext = require('@basetime/bldr-sfmc-sdk/dist/sfmc/utils/sfmcContextMapping');
const find = require('lodash.find');
/**
 * Notes June 2
 * Left off replacing matchedValue references with the new bldr IDs
 * Need to work on ContentBlockByName
 * Plan out deploy flow
 */
class Deploy {
    constructor() {
        /**
         *
         * @param argv
         * @returns
         */
        this.deployPackage = (argv) => __awaiter(this, void 0, void 0, function* () {
            try {
                allowTracking() && (0, metrics_1.incrementMetric)('req_command_deploy');
                const packageJSON = yield (0, bldrFileSystem_1.readPackageManifest)();
                const availableContexts = sfmcContext.sfmc_context_mapping.map((ctx) => ctx.context);
                const packageContexts = Object.keys(packageJSON).map((key) => {
                    return availableContexts.includes(key) && typeof key === 'string' && key;
                });
                let sfmcOnly = false;
                if (argv['sfmc-only']) {
                    sfmcOnly = true;
                }
                let localOnly = false;
                if (argv['local-only']) {
                    localOnly = true;
                }
                if (yield this.deployCheckConfig()) {
                    return;
                }
                const sdk = !localOnly && (yield (0, _bldr_sdk_1.initiateBldrSDK)());
                for (const c in packageContexts) {
                    const context = packageContexts[c];
                    if (context && packageJSON[context]) {
                        yield (0, manifestJSON_1.updateManifest)(context, { assets: [], folders: [] });
                        const pkgAssets = packageJSON[context]['assets'];
                        let pkgFolderPaths = pkgAssets
                            .map((asset) => asset.assetType &&
                            asset.assetType.name &&
                            !packageDeployIgnore_1.packageDeployIgnore.includes(asset.assetType.name) &&
                            asset.category.folderPath)
                            .filter(Boolean);
                        pkgFolderPaths = [...new Set(pkgFolderPaths)];
                        !sfmcOnly && (0, display_1.displayLine)(`Creating ${context} Local Files`, 'progress');
                        !sfmcOnly && (yield (0, CreateFilesBasedOnContext_1.createEditableFilesBasedOnContext)(context, pkgAssets));
                        (0, display_1.displayLine)(`Creating ${context} folders in sfmc`, 'progress');
                        for (const fp in pkgFolderPaths) {
                            const ctxDetails = sfmcContext.sfmc_context_mapping.find((ctx) => ctx.context === context);
                            const folder = ctxDetails && {
                                path: pkgFolderPaths[fp],
                                context: ctxDetails,
                            };
                            !localOnly && (yield (0, CreateSFMCFolders_1.addNewFolders)(sdk, folder));
                        }
                    }
                }
                const package_dataExtension = packageContexts.includes('dataExtension') && packageJSON['dataExtension']['assets'];
                const package_contentBuilder = packageContexts.includes('contentBuilder') && packageJSON['contentBuilder']['assets'];
                const package_automationStudio = packageContexts.includes('automationStudio') && packageJSON['automationStudio']['assets'];
                const package_dataExtensionValid = sdk &&
                    package_dataExtension &&
                    (yield this.deploymentValid(sdk, 'dataExtension', package_dataExtension));
                console.log({ package_dataExtensionValid });
                !localOnly && sdk && package_dataExtension && package_dataExtensionValid && (yield this.deployDataExtension(sdk, package_dataExtension));
                !localOnly &&
                    sdk &&
                    package_contentBuilder &&
                    (yield this.deployContentBuilderAssets(sdk, package_contentBuilder));
                sfmcOnly && fs_1.default.unlinkSync('./.local.manifest.json');
            }
            catch (err) {
                console.log(err);
            }
        });
        this.deployCheckConfig = () => __awaiter(this, void 0, void 0, function* () {
            let preventDeployment = false;
            const dirPath = yield (0, fileSystem_1.getRootPath)();
            if ((0, fileSystem_1.fileExists)(`${dirPath}/.sfmc.env.json`)) {
                const config = yield (0, bldrFileSystem_1.readBldrSfmcEnv)();
                for (const c in config) {
                    const key = c;
                    const value = config[c];
                    if (value === '') {
                        console.log(`Please configure ${key} in .sfmc.env.json`);
                        preventDeployment = true;
                    }
                }
            }
            return preventDeployment;
        });
        /**
         *
         * @param sdk
         * @param contentBuilderAssets
         */
        this.deployContentBuilderAssets = (sdk, contentBuilderAssets) => __awaiter(this, void 0, void 0, function* () {
            try {
                //Find 0 Dependency assets
                const noDependencyAssets = contentBuilderAssets
                    .map((asset) => {
                    if ((asset.dependencies && asset.dependencies.length === 0) || !asset.dependencies) {
                        return asset;
                    }
                })
                    .filter(Boolean);
                const dependencyAssets = contentBuilderAssets
                    .map((asset) => {
                    if (asset.dependencies && asset.dependencies.length > 0) {
                        return asset;
                    }
                })
                    .filter(Boolean);
                for (const nd in noDependencyAssets) {
                    const asset = noDependencyAssets[nd];
                    yield this.deployContentBuilderAssetNoDependencies(sdk, asset);
                }
                for (const d in dependencyAssets) {
                    const depAsset = dependencyAssets[d];
                    yield this.deployContentBuilderAssetWithDependencies(sdk, depAsset);
                }
            }
            catch (err) {
                console.log('ERR', err);
            }
        });
        /**
         *
         * @param sdk
         * @param contentBuilderAsset
         */
        this.deployContentBuilderAssetNoDependencies = (sdk, contentBuilderAsset) => __awaiter(this, void 0, void 0, function* () {
            const manifestJSON = yield (0, bldrFileSystem_2.readManifest)();
            const manifestJSONFolders = manifestJSON['contentBuilder']['folders'];
            const contentFolderPath = contentBuilderAsset.category.folderPath;
            const category = manifestJSONFolders.find((folder) => folder.folderPath === contentFolderPath);
            //Update asset content with configurations before posting
            let content = contentBuilderAsset.content;
            let buildContent = yield (0, bldrFileSystem_1.replaceBldrSfmcEnv)(content);
            contentBuilderAsset.category = category;
            contentBuilderAsset.bldr = {
                bldrId: contentBuilderAsset.bldrId,
            };
            contentBuilderAsset = yield (0, definitions_1.setContentBuilderDefinition)(contentBuilderAsset, buildContent);
            if (category) {
                contentBuilderAsset.category = {
                    id: category.id,
                };
            }
            const createAsset = (!packageDeployIgnore_1.packageDeployIgnore.includes(contentBuilderAsset.assetType.name) &&
                (yield sdk.sfmc.asset.postAsset(contentBuilderAsset))) ||
                (0, display_1.displayLine)(`${contentBuilderAsset.assetType.name} asset type requires the user to create the asset manually. Create the asset, then run the [ bldr clone ] command to get the asset.`);
            if (packageDeployIgnore_1.packageDeployIgnore.includes(contentBuilderAsset.assetType.name)) {
            }
            else if (createAsset.status === 'ERROR') {
                console.log(createAsset);
            }
            else {
                (0, display_1.displayLine)(`created [sfmc]: ${contentBuilderAsset.name}`, 'success');
                contentBuilderAsset.id = createAsset.id;
                contentBuilderAsset.assetType = createAsset.assetType;
                contentBuilderAsset.category = createAsset.category;
                contentBuilderAsset.customerKey = createAsset.customerKey;
                contentBuilderAsset.category.folderPath = contentFolderPath;
                // Update ManifestJSON file with responses
                yield (0, manifestJSON_1.updateManifest)('contentBuilder', { assets: [contentBuilderAsset] });
            }
        });
        /**
         *
         * @param sdk
         * @param contentBuilderAssets
         */
        this.deployContentBuilderAssetWithDependencies = (sdk, contentBuilderAsset) => __awaiter(this, void 0, void 0, function* () {
            //Get assets dependencies
            const assetDependencies = contentBuilderAsset.dependencies;
            const contentFolderPath = contentBuilderAsset.category.folderPath;
            const updatedAsset = yield this.updateContentBuilderReferences(contentBuilderAsset, assetDependencies);
            const createAsset = (!packageDeployIgnore_1.packageDeployIgnore.includes(contentBuilderAsset.assetType.name) &&
                (yield sdk.sfmc.asset.postAsset(updatedAsset))) ||
                (0, display_1.displayLine)(`${contentBuilderAsset.assetType.name} asset type requires the user to create the asset manually. Create the asset, then run the [ bldr clone ] command to get the asset.`);
            if (packageDeployIgnore_1.packageDeployIgnore.includes(contentBuilderAsset.assetType.name)) {
                yield (0, manifestJSON_1.updateManifest)('contentBuilder', { assets: [updatedAsset] });
                yield (0, CreateFilesBasedOnContext_1.createEditableFilesBasedOnContext)('contentBuilder', [updatedAsset]);
            }
            else if (createAsset.status === 'ERROR') {
                console.log(createAsset.statusText);
            }
            else {
                (0, display_1.displayLine)(`created [sfmc]: ${contentBuilderAsset.name}`, 'success');
                updatedAsset.id = createAsset.id;
                updatedAsset.assetType = createAsset.assetType;
                updatedAsset.category = createAsset.category;
                updatedAsset.customerKey = createAsset.customerKey;
                updatedAsset.category.folderPath = contentFolderPath;
                // Update ManifestJSON file with responses
                yield (0, manifestJSON_1.updateManifest)('contentBuilder', { assets: [updatedAsset] });
                yield (0, CreateFilesBasedOnContext_1.createEditableFilesBasedOnContext)('contentBuilder', [updatedAsset]);
            }
        });
        /**
         *
         * @param contentBuilderAsset
         * @param assetDependencies
         * @returns
         */
        this.updateContentBuilderReferences = (contentBuilderAsset, assetDependencies) => __awaiter(this, void 0, void 0, function* () {
            let createdId;
            let content = contentBuilderAsset.content;
            content = yield (0, bldrFileSystem_1.replaceBldrSfmcEnv)(content);
            const manifestJSON = yield (0, bldrFileSystem_2.readManifest)();
            const manifestJSONFolders = manifestJSON['contentBuilder']['folders'];
            const contentFolderPath = contentBuilderAsset.category.folderPath;
            const category = manifestJSONFolders.find((folder) => folder.folderPath === contentFolderPath);
            contentBuilderAsset.category = category;
            contentBuilderAsset.bldr = {
                bldrId: contentBuilderAsset.bldrId,
            };
            for (const a in assetDependencies) {
                const assetDependency = assetDependencies[a];
                const assetContext = assetDependency.context;
                const manifestContextAssets = manifestJSON[assetContext]['assets'];
                const findObj = yield find(manifestContextAssets, (o) => {
                    return o.bldrId === assetDependency.bldrId;
                });
                if (findObj) {
                    switch (assetDependency.reference) {
                        case 'Lookup':
                        case 'LookupRows':
                        case 'ClaimRow':
                        case 'DataExtensionRowCount':
                        case 'DeleteData':
                        case 'DeleteDE':
                        case 'InsertDE':
                        case 'UpdateData':
                        case 'UpdateDE':
                        case 'UpsertData':
                        case 'UpsertDE':
                        case 'LookupOrderedRows':
                        case 'LookupOrderedRowsCS':
                        case 'LookupRowsCS':
                            createdId = findObj.name;
                            break;
                        case 'ContentBlockById':
                        case 'ContentBlockByID':
                            createdId = findObj.id;
                            break;
                        case 'ContentBlockByName':
                            if (content.match(new RegExp(`(?<=Platform.Function.ContentBlockByName\\(')${assetDependency.bldrId}`, 'g')) ||
                                content.match(new RegExp(`(?<=Platform.Function.ContentBlockByName\\(")${assetDependency.bldrId}`, 'g'))) {
                                createdId = `${findObj.category.folderPath}/${findObj.name}`.replaceAll('/', '\\\\');
                            }
                            else {
                                createdId = `${findObj.category.folderPath}/${findObj.name}`.replaceAll('/', '\\');
                            }
                            break;
                    }
                    content = content.replaceAll(assetDependency.bldrId, createdId);
                }
            }
            return (0, definitions_1.setContentBuilderDefinition)(contentBuilderAsset, content);
        });
        /**
         *
         * @param sdk
         * @param dataExtensions
         * @returns
         */
        this.deployDataExtension = (sdk, dataExtensions) => __awaiter(this, void 0, void 0, function* () {
            try {
                const output = [];
                for (const d in dataExtensions) {
                    let dataExtension = dataExtensions[d];
                    const dataExtensionFields = dataExtension.fields;
                    const manifestJSON = yield (0, bldrFileSystem_2.readManifest)();
                    const manifestJSONFolder = manifestJSON['dataExtension']['folders'].find((folder) => folder.folderPath === dataExtension.category.folderPath && folder);
                    if (manifestJSONFolder) {
                        dataExtension.categoryId = manifestJSONFolder.id;
                    }
                    else {
                        delete dataExtension.category;
                    }
                    const createDataExtension = yield sdk.sfmc.emailStudio.postAsset(dataExtension);
                    if (createDataExtension.OverallStatus === 'OK') {
                        dataExtension.fields = dataExtensionFields;
                        yield (0, manifestJSON_1.updateManifest)('dataExtension', {
                            assets: [dataExtension],
                        });
                        (0, display_1.displayLine)(`Created [sfmc]: ${dataExtension.name}`, 'success');
                        output.push(dataExtension);
                    }
                    else {
                        (0, display_1.displayLine)(`Error Creating: ${dataExtension.name}`);
                        console.log(JSON.stringify(createDataExtension, null, 2));
                    }
                }
                return output;
            }
            catch (err) {
                const statusMessage = err && err.JSON && err.JSON.Results && err.JSON.Results.length && err.JSON.Results[0].StatusMessage;
                (0, display_1.displayLine)(statusMessage, 'error');
                statusMessage &&
                    statusMessage.includes('Updating an existing Data Extension definition') &&
                    (0, display_1.displayLine)('Please ensure all Data Extension names/customer keys are unique', 'error');
            }
        });
        this.deploymentValid = (sdk, context, assets) => __awaiter(this, void 0, void 0, function* () {
            let contextValidity = [];
            (0, display_1.displayLine)(`Checking ${context} validation`, 'info');
            for (const a in assets) {
                const asset = assets[a];
                switch (context) {
                    case 'dataExtension':
                        const check = yield sdk.sfmc.emailStudio.searchDataExtensionByName({
                            searchKey: 'Name',
                            searchTerm: asset.name,
                        });
                        if (check && check.Results && check.Results.length) {
                            contextValidity.push({
                                status: 'error',
                                msg: `${asset.name} already exists.`,
                            });
                        }
                        else {
                            contextValidity.push({
                                status: 'success',
                                msg: `${asset.name} is does not currently exist.`,
                            });
                        }
                        break;
                }
            }
            const valid = contextValidity.find((asset) => asset.status === 'error') ? false : true;
            contextValidity && contextValidity.length && contextValidity.forEach((asset) => (0, display_1.displayLine)(asset.msg, asset.status));
            contextValidity && contextValidity.length && !valid && (0, display_1.displayLine)('Address any conflicts and run [ bldr deploy ] again.', 'progress');
            contextValidity && contextValidity.length && valid && (0, display_1.displayLine)('No conflicts to address.', 'success');
            return valid;
        });
    }
}
exports.Deploy = Deploy;
