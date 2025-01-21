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
exports.Package = void 0;
const fileSystem_1 = require("../../../_utils/fileSystem");
const bldrFileSystem_1 = require("../../../_utils/bldrFileSystem/");
const package_new_1 = require("../../../_utils/options/package_new");
const yargs_interactive_1 = __importDefault(require("yargs-interactive"));
const fileSystem_2 = require("../../../_utils/fileSystem");
const _bldr_sdk_1 = require("../../../_bldr_sdk");
const CreateFilesBasedOnContext_1 = require("../../../_utils/bldrFileSystem/_context/CreateFilesBasedOnContext");
const display_1 = require("../../../_utils/display");
const _utils_1 = require("../../_utils");
const state_1 = require("../state");
const metrics_1 = require("../../../_utils/metrics");
const package_BuildAutomationSteps_1 = require("../_contexts/automationStudio/package/package_BuildAutomationSteps");
const setActivityDependencies_1 = require("../_contexts/automationStudio/package/setActivityDependencies");
const { allowTracking } = new state_1.State();
/**
 */
class Package {
    constructor() {
        this.packageConfig = () => __awaiter(this, void 0, void 0, function* () {
            try {
                const dirPath = yield (0, fileSystem_1.getRootPath)();
                if (!(0, fileSystem_1.fileExists)(`${dirPath}.local.manifest.json`)) {
                    throw new Error('Please run [ bldr init ] or clone SFMC assets before running [ bldr package ]');
                }
                let manifestJSON = yield (0, bldrFileSystem_1.readManifest)();
                const existingPkg = yield (0, bldrFileSystem_1.readPackageManifest)();
                yield (0, yargs_interactive_1.default)()
                    .usage('$0 <command> [args]')
                    .interactive(yield (0, package_new_1.package_new)(existingPkg))
                    .then((initResults) => __awaiter(this, void 0, void 0, function* () {
                    var _a, _b;
                    try {
                        const sdk = yield (0, _bldr_sdk_1.initiateBldrSDK)();
                        let packageOut = {};
                        packageOut.name = initResults.name;
                        packageOut.version = initResults.packageVersion;
                        packageOut.repository = initResults.repository;
                        packageOut.description = initResults.description;
                        const tagsSplit = (initResults.tags && initResults.tags.split(',')) || [];
                        const tagsArray = (tagsSplit === null || tagsSplit === void 0 ? void 0 : tagsSplit.map((tag) => tag.trim())) || [];
                        packageOut.tags = tagsArray;
                        const sfmcEnv = (yield (0, bldrFileSystem_1.readBldrSfmcEnvTemplate)()) || null;
                        if (sfmcEnv) {
                            packageOut['sfmcEnv'] = sfmcEnv;
                        }
                        const availableContexts = Object.keys(manifestJSON);
                        availableContexts.shift();
                        for (const c in availableContexts) {
                            const context = availableContexts[c];
                            manifestJSON = yield (0, bldrFileSystem_1.readManifest)();
                            let contextAssets = manifestJSON[context]['assets'];
                            contextAssets = yield (0, bldrFileSystem_1.replaceBldrSfmcEnv)(JSON.stringify(contextAssets));
                            contextAssets = JSON.parse(contextAssets);
                            let automationStudioPKGAssets;
                            switch (context) {
                                case 'contentBuilder':
                                    (0, display_1.displayLine)(`Gathering Dependencies for ${contextAssets.length} Assets`, 'info');
                                    yield sdk.cli.contentBuilder.setContentBuilderPackageAssets(packageOut, contextAssets);
                                    const gatherDependencies = yield sdk.cli.contentBuilder.setContentBuilderDependenciesFromPackage(packageOut);
                                    const newDependencies = (gatherDependencies &&
                                        gatherDependencies.newDependencies &&
                                        Object.keys(gatherDependencies.newDependencies)) ||
                                        [];
                                    const newContextKeys = (newDependencies && Object.keys(newDependencies)) || [];
                                    newContextKeys &&
                                        newContextKeys.length &&
                                        (0, display_1.displayLine)(`Creating files for ${newContextKeys.join(', ')}`, 'info');
                                    for (const k in newContextKeys) {
                                        (0, display_1.displayLine)(`Working on ${newContextKeys[k]}`, 'progress');
                                        let newAssets = newDependencies[newContextKeys[k]]['assets'];
                                        yield (0, CreateFilesBasedOnContext_1.createEditableFilesBasedOnContext)(newContextKeys[k], newAssets);
                                    }
                                    break;
                                case 'dataExtension':
                                    const dataExtensionPkgAssets = existingPkg && existingPkg[context] && existingPkg[context]['assets']
                                        ? yield (0, _utils_1.uniqueArrayByKey)([...existingPkg.dataExtension.assets, ...contextAssets], 'name')
                                        : contextAssets;
                                    dataExtensionPkgAssets &&
                                        dataExtensionPkgAssets.forEach((de) => {
                                            var _a;
                                            de.assetType = {
                                                name: 'dataextension',
                                            };
                                            delete de.categoryId;
                                            (_a = de.category) === null || _a === void 0 ? true : delete _a.id;
                                            delete de.customerKey;
                                        });
                                    packageOut.dataExtension = {
                                        assets: dataExtensionPkgAssets,
                                    };
                                    break;
                                case 'automationStudio':
                                    console.log('AS START');
                                    contextAssets &&
                                        contextAssets.forEach((asset) => __awaiter(this, void 0, void 0, function* () {
                                            if (!packageOut['automationStudio'] ||
                                                !packageOut['automationStudio']['assets']) {
                                                packageOut['automationStudio'] = {
                                                    assets: [],
                                                };
                                            }
                                            let assetObject;
                                            if (asset.assetType.name === 'automation') {
                                                assetObject = {
                                                    name: asset.name,
                                                    description: asset.description,
                                                    key: asset.name,
                                                    categoryId: null,
                                                    typeId: 1,
                                                    type: 'scheduled',
                                                    statusId: 2,
                                                    status: 'Ready',
                                                    steps: (0, package_BuildAutomationSteps_1.buildAutomationSteps)(asset, contextAssets),
                                                };
                                            }
                                            else {
                                                assetObject = yield (0, setActivityDependencies_1.setAutomationActivityDependencies)(asset, manifestJSON);
                                            }
                                            console.log({ assetObject });
                                            packageOut['automationStudio']['assets'].push(assetObject);
                                        }));
                                    // console.log('automationAssets', automationAssets);
                                    // console.log('activityAssets', activityAssets);
                                    break;
                            }
                        }
                        (_a = packageOut === null || packageOut === void 0 ? void 0 : packageOut.contentBuilder) === null || _a === void 0 ? void 0 : _a.assets.forEach((asset) => {
                            delete asset.id;
                            delete asset.exists;
                        });
                        (_b = packageOut === null || packageOut === void 0 ? void 0 : packageOut.dataExtension) === null || _b === void 0 ? void 0 : _b.assets.forEach((asset) => {
                            delete asset.category.categoryId;
                        });
                        let packageOutRendered = yield (0, bldrFileSystem_1.scrubBldrSfmcEnv)(JSON.stringify(packageOut));
                        packageOutRendered = JSON.parse(packageOutRendered);
                        yield (0, fileSystem_2.createFile)('./package.manifest.json', JSON.stringify(packageOutRendered, null, 2));
                        allowTracking() && (0, metrics_1.incrementMetric)('req_command_package');
                    }
                    catch (err) {
                        console.log(err);
                    }
                }));
            }
            catch (err) {
                console.log(err);
            }
        });
    }
}
exports.Package = Package;
