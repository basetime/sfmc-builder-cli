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
exports.DataExtensionSwitch = void 0;
const flat_1 = __importDefault(require("flat"));
const config_1 = require("../../../_bldr/_processes/config");
const state_1 = require("../../../_bldr/_processes/state");
const _utils_1 = require("../../../_bldr/_utils");
const _bldr_sdk_1 = require("../../../_bldr_sdk");
const manifestJSON_1 = require("../../../_utils/bldrFileSystem/manifestJSON");
const CreateLocalFiles_1 = require("../../../_utils/bldrFileSystem/_context/dataExtension/CreateLocalFiles");
const display_1 = require("../../../_utils/display");
const metrics_1 = require("../../../_utils/metrics");
const { getInstanceConfiguration } = new config_1.Config();
const { allowTracking, getState, debug } = new state_1.State();
/**
 * Flag routing for Config command
 *
 * @param {string} req
 * @param {object} argv
 * @param {object} store
 *
 */
const DataExtensionSwitch = (req, argv) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const bldr = yield (0, _bldr_sdk_1.initiateBldrSDK)();
        //@ts-ignore //TODO figure out why contentBuilder is throwing TS error
        const { emailStudio } = bldr.cli;
        if (!bldr) {
            throw new Error('unable to load sdk');
        }
        // If authObject is not passed use the current set credentials to initiate SDK
        const currentState = yield getState();
        const stateInstance = currentState.instance;
        const activeMID = currentState.activeMID;
        const stateConfiguration = yield getInstanceConfiguration(stateInstance);
        switch (req) {
            case 'search':
                /**
                 * Search for Data Extension Folders
                 */
                if (typeof argv.f === 'string' && argv.f.includes(':')) {
                    const flag = argv.f.split(':')[1];
                    const shared = flag && flag === 'shared' ? true : false;
                    const searchTerm = argv._ && argv._[1];
                    const searchRequest = yield emailStudio.searchFolders({
                        contentType: shared ? 'shared_dataextension' : 'dataextension',
                        searchKey: 'Name',
                        searchTerm: searchTerm,
                    });
                    (0, display_1.displayLine)(`${searchTerm} Search Results | ${searchRequest.length} Results`, 'info');
                    searchRequest &&
                        searchRequest.length &&
                        searchRequest.forEach((obj) => {
                            (0, display_1.displayObject)((0, flat_1.default)(obj));
                        });
                    allowTracking() && (0, metrics_1.incrementMetric)('req_searches_sharedDataExtension_folders');
                }
                else if ((typeof argv.f === 'string' && !argv.f.includes(':')) || typeof argv.f === 'number') {
                    const searchRequest = yield emailStudio.searchFolders({
                        contentType: 'dataextension',
                        searchKey: 'Name',
                        searchTerm: argv.f,
                    });
                    (0, display_1.displayLine)(`${argv.f} Search Results | ${searchRequest.length} Results`, 'info');
                    searchRequest &&
                        searchRequest.length === 0 &&
                        (0, display_1.displayLine)(`Search returned no results. If you're searching for a shared item update command to '-f:shared'`, 'info');
                    searchRequest &&
                        searchRequest.length &&
                        searchRequest.forEach((obj) => {
                            (0, display_1.displayObject)((0, flat_1.default)(obj));
                        });
                    allowTracking() && (0, metrics_1.incrementMetric)('req_searches_dataExtension_folders');
                }
                /**
                 * Search for Data Extension Assets
                 */
                if (typeof argv.a === 'string' && argv.a.includes(':')) {
                    const flag = argv.a.split(':')[1];
                    const shared = flag && flag === 'shared' ? true : false;
                    const searchTerm = argv._ && argv._[1];
                    const searchRequest = yield emailStudio.searchDataExtensions({
                        searchKey: 'Name',
                        searchTerm: searchTerm,
                        shared,
                    });
                    (0, display_1.displayLine)(`${searchTerm} Search Results | ${searchRequest.length} Results`, 'info');
                    searchRequest &&
                        searchRequest.length === 0 &&
                        (0, display_1.displayLine)(`Search returned no results. If you're searching for a shared item update command to '-a:shared'`, 'info');
                    searchRequest &&
                        searchRequest.length &&
                        searchRequest.forEach((item) => (0, display_1.displayObject)(item));
                    allowTracking() && (0, metrics_1.incrementMetric)('req_searches_sharedDataExtension_assets');
                }
                else if (typeof argv.a === 'string' && !argv.a.includes(':')) {
                    const searchRequest = yield emailStudio.searchDataExtensions({
                        searchKey: 'Name',
                        searchTerm: argv.a,
                    });
                    (0, display_1.displayLine)(`${argv.a} Search Results | ${searchRequest.length} Results`, 'info');
                    searchRequest &&
                        searchRequest.length &&
                        searchRequest.forEach((obj) => {
                            (0, display_1.displayObject)((0, flat_1.default)(obj));
                        });
                    allowTracking() && (0, metrics_1.incrementMetric)('req_searches_dataExtension_assets');
                }
                break;
            case 'clone':
                (0, display_1.displayLine)(`Starting Clone`, 'info');
                /**
                 * Clone Data Extension Folders
                 */
                if (typeof argv.f === 'string' && argv.f.includes(':')) {
                    const flag = argv.f.split(':')[1];
                    const shared = flag && flag === 'shared' ? true : false;
                    const searchTerm = argv._ && argv._[1];
                    const cloneRequest = yield emailStudio.gatherAssetsByCategoryId({
                        contentType: shared ? 'shared_dataextension' : 'dataextension',
                        categoryId: searchTerm,
                    });
                    debug('Clone Request', 'info', cloneRequest);
                    if (!cloneRequest.folders || !cloneRequest.assets) {
                        (0, display_1.displayLine)(`Could not find ${searchTerm}. If it's a shared item, update your command with '-a:shared'`, 'info');
                        return;
                    }
                    const isolatedFoldersUnique = (cloneRequest &&
                        cloneRequest.folders &&
                        cloneRequest.folders.length &&
                        (0, _utils_1.uniqueArrayByKey)(cloneRequest.folders, 'id')) ||
                        [];
                    cloneRequest &&
                        cloneRequest.assets &&
                        cloneRequest.assets.length &&
                        (yield (0, CreateLocalFiles_1.createEmailStudioEditableFiles)(cloneRequest.assets));
                    cloneRequest.assets &&
                        isolatedFoldersUnique &&
                        (yield (0, manifestJSON_1.updateManifest)('sharedDataExtension', {
                            assets: cloneRequest.assets,
                            folders: isolatedFoldersUnique,
                        }));
                    allowTracking() && (0, metrics_1.incrementMetric)('req_clones_sharedDataExtension_folders');
                }
                else if ((typeof argv.f === 'string' && !argv.f.includes(':')) || typeof argv.f === 'number') {
                    const cloneRequest = yield emailStudio.gatherAssetsByCategoryId({
                        contentType: 'dataextension',
                        categoryId: argv.f,
                    });
                    debug('Clone Request', 'info', cloneRequest);
                    if (!cloneRequest.folders || !cloneRequest.assets) {
                        (0, display_1.displayLine)(`Could not find ${argv.f}. If it's a shared item, update your command with '-f:shared'`, 'info');
                        return;
                    }
                    const isolatedFoldersUnique = (cloneRequest &&
                        cloneRequest.folders &&
                        cloneRequest.folders.length &&
                        (0, _utils_1.uniqueArrayByKey)(cloneRequest.folders, 'id')) ||
                        [];
                    cloneRequest &&
                        cloneRequest.assets &&
                        cloneRequest.assets.length &&
                        (yield (0, CreateLocalFiles_1.createEmailStudioEditableFiles)(cloneRequest.assets));
                    cloneRequest.assets &&
                        isolatedFoldersUnique &&
                        (yield (0, manifestJSON_1.updateManifest)('dataExtension', {
                            assets: cloneRequest.assets,
                            folders: isolatedFoldersUnique,
                        }));
                    allowTracking() && (0, metrics_1.incrementMetric)('req_clones_dataExtension_folders');
                }
                /**
                 * Search for Data Extension Assets
                 */
                if (typeof argv.a === 'string' && argv.a.includes(':')) {
                    const flag = argv.a.split(':')[1];
                    const shared = flag && flag === 'shared' ? true : false;
                    const completeResponse = false;
                    const customerKey = argv._ && argv._[1];
                    const cloneRequest = yield emailStudio.gatherAssetById(customerKey, completeResponse, shared);
                    debug('Clone Request', 'info', cloneRequest);
                    if (!cloneRequest.folders || !cloneRequest.assets) {
                        (0, display_1.displayLine)(`Could not find ${customerKey}. If it's a shared item, update your command with '-a:shared'`, 'info');
                        return;
                    }
                    const isolatedFoldersUnique = (cloneRequest &&
                        cloneRequest.folders &&
                        cloneRequest.folders.length &&
                        (0, _utils_1.uniqueArrayByKey)(cloneRequest.folders, 'id')) ||
                        [];
                    cloneRequest &&
                        cloneRequest.assets &&
                        cloneRequest.assets.length &&
                        (yield (0, CreateLocalFiles_1.createEmailStudioEditableFiles)(cloneRequest.assets));
                    cloneRequest.assets &&
                        isolatedFoldersUnique &&
                        (yield (0, manifestJSON_1.updateManifest)('dataExtension', {
                            assets: cloneRequest.assets,
                            folders: isolatedFoldersUnique,
                        }));
                    allowTracking() && (0, metrics_1.incrementMetric)('req_clones_dataExtension_assets');
                }
                else if ((typeof argv.a === 'string' && !argv.a.includes(':')) || typeof argv.a === 'number') {
                    const cloneRequest = yield emailStudio.gatherAssetById(argv.a);
                    debug('Clone Request', 'info', cloneRequest);
                    if (!cloneRequest.folders || !cloneRequest.assets) {
                        (0, display_1.displayLine)(`Could not find ${argv.a}. If it's a shared item, update your command with '-a:shared'`, 'info');
                        return;
                    }
                    const isolatedFoldersUnique = (cloneRequest &&
                        cloneRequest.folders &&
                        cloneRequest.folders.length &&
                        (0, _utils_1.uniqueArrayByKey)(cloneRequest.folders, 'id')) ||
                        [];
                    cloneRequest &&
                        cloneRequest.assets &&
                        cloneRequest.assets.length &&
                        (yield (0, CreateLocalFiles_1.createEmailStudioEditableFiles)(cloneRequest.assets));
                    cloneRequest.assets &&
                        isolatedFoldersUnique &&
                        (yield (0, manifestJSON_1.updateManifest)('dataExtension', {
                            assets: cloneRequest.assets,
                            folders: isolatedFoldersUnique,
                        }));
                    allowTracking() && (0, metrics_1.incrementMetric)('req_clones_dataExtension_assets');
                }
                break;
            case 'audit':
                (0, display_1.displayLine)(`Starting Data Extension Audit`, 'info');
                const deRequest = yield bldr.sfmc.emailStudio.retrieveAllDataExtensions();
                console.log('deRequest', deRequest);
                /**
                 * Clone Data Extension Folders
                 */
                if (typeof argv.f === 'string' && argv.f.includes(':')) {
                    const flag = argv.f.split(':')[1];
                    const shared = flag && flag === 'shared' ? true : false;
                    const searchTerm = argv._ && argv._[1];
                    allowTracking() && (0, metrics_1.incrementMetric)('req_audit_sharedDataExtension_folders');
                }
                else if ((typeof argv.f === 'string' && !argv.f.includes(':')) || typeof argv.f === 'number') {
                    const deRequest = yield emailStudio.retrieveAllDataExtensions();
                    console.log('deRequest', deRequest);
                    allowTracking() && (0, metrics_1.incrementMetric)('req_audit_dataExtension_folders');
                }
                break;
        }
        return;
    }
    catch (err) {
        console.log('err', err);
    }
});
exports.DataExtensionSwitch = DataExtensionSwitch;
