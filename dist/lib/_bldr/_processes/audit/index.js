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
exports.Audit = void 0;
const _bldr_sdk_1 = require("../../../_bldr_sdk");
const display_1 = require("../../../_utils/display");
const state_1 = require("../state");
const _utils_1 = require("../../_utils");
const fileSystem_1 = require("../../../_utils/fileSystem");
const json_2_csv_1 = require("json-2-csv");
const sfmc_soap_object_reference_1 = require("sfmc-soap-object-reference");
const fs_1 = __importDefault(require("fs"));
const { getState, allowTracking, debug } = new state_1.State();
const rawResponsesBasePath = './audit/raw_api_responses';
/**
 * Handles all Configuration commands
 * @property {object} coreConfiguration
 * @property {object} stateConfiguration
 */
class Audit {
    constructor() {
        /**
         * Initiate the setting of a Configuration
         * Prompts user input
         * Tests/Gathers all child business unit Names and MIDs
         * Saves configuration to config file
         * Sets configuration to state management file
         * @param argv
         *
         */
        this.initiateAudit = (argv) => __awaiter(this, void 0, void 0, function* () {
            try {
                const sdk = yield (0, _bldr_sdk_1.initiateBldrSDK)();
                (0, fileSystem_1.createDirectory)(`${rawResponsesBasePath}`);
                const deAudit = yield this.auditJSON();
                // await this.auditDataExtensions(sdk);
                // await this.auditAutomations(sdk);
                // await this.auditBulkSoap(sdk);
                // await this.auditBulkRest(sdk);
                console.log({ deAudit });
            }
            catch (err) {
                err.message && (0, display_1.displayLine)(err.message, 'error');
                return err;
            }
        });
        this.auditJSON = () => __awaiter(this, void 0, void 0, function* () {
            const auditKeys = ['ObjectID', 'CustomerKey', 'ID', 'objectId', 'customerKey', 'id'];
            const dataRaw = fs_1.default.readFileSync(`./audit/raw_api_responses/json/automations.json`);
            const data = JSON.parse(dataRaw.toString());
            return data.map((item) => {
                const keys = Object.keys(item);
                const objectAuditKeys = keys.map((key) => (auditKeys.includes(key) && item[key]) || null).filter(Boolean);
                return objectAuditKeys;
            });
        });
        this.writeLocalFiles = (data, fileName) => __awaiter(this, void 0, void 0, function* () {
            (0, fileSystem_1.createFile)(`${rawResponsesBasePath}/csv/${fileName}.csv`, (0, json_2_csv_1.json2csv)(data));
            (0, fileSystem_1.createFile)(`${rawResponsesBasePath}/json/${fileName}.json`, data);
        });
        this.auditBulkRest = (sdk) => __awaiter(this, void 0, void 0, function* () {
            const requestParams = [
                'interaction/v1/interactions',
                'asset/v1/content/assets',
                'interaction/v1/eventDefinitions',
                'contacts/v1/attributeSetDefinitions',
            ];
            for (const r in requestParams) {
                const param = requestParams[r];
                const paramId = param.split('/')[param.split('/').length - 1].toLowerCase();
                (0, display_1.displayLine)(`Fetching ${param}...`, 'progress');
                const request = yield sdk.sfmc.client.rest.getBulk(param);
                // request.object = param;
                if (request && request.items) {
                    this.writeLocalFiles(request.items, paramId);
                }
            }
        });
        this.auditBulkSoap = (sdk) => __awaiter(this, void 0, void 0, function* () {
            const requestParams = [
                'EmailSendDefinition',
                'ExtractDefinition',
                'FileTrigger',
                'FilterDefinition',
                'ImportDefinition',
                'QueryDefinition',
                'TriggeredSendDefinition',
            ];
            for (const r in requestParams) {
                const param = requestParams[r];
                let properties = (0, sfmc_soap_object_reference_1.getProperties)(param);
                if (param === 'EmailSendDefinition') {
                    properties = properties.filter((p) => !p.includes('DeliveryProfile') && !p.includes('SendWindowCloses'));
                }
                (0, display_1.displayLine)(`Fetching ${param}...`, 'progress');
                const request = yield sdk.sfmc.client.soap.retrieveBulk(param, properties, {
                    filter: {
                        leftOperand: 'Name',
                        operator: 'isNotNull',
                        rightOperand: '',
                    },
                });
                request.object = param;
                if (request && request.Results) {
                    this.writeLocalFiles(request.Results, param.toLowerCase());
                }
            }
        });
        this.auditAutomations = (sdk) => __awaiter(this, void 0, void 0, function* () {
            const RootResp = yield sdk.sfmc.folder.search({
                contentType: 'automations',
                searchKey: 'Name',
                searchTerm: 'my automations',
            });
            const rootId = RootResp && RootResp.Results && RootResp.Results[0] && RootResp.Results[0].ID;
            const automationFolders = yield sdk.sfmc.folder.getSubfoldersRecursive({
                contentType: 'automations',
                categoryId: rootId,
            });
            const folderIds = automationFolders.map((folder) => ({
                id: folder.ID,
                name: folder.Name,
            }));
            folderIds.push(rootId);
            const chunks = (0, _utils_1.splitArrayIntoChunks)(folderIds, 10);
            (0, display_1.displayLine)('Fetching Automations...', 'progress');
            (0, display_1.displayLine)(`Total Automation Folders: ${folderIds.length}`, 'info');
            const mapFn = (folder) => __awaiter(this, void 0, void 0, function* () {
                const subResponse = yield sdk.cli.automationStudio.gatherAssetsByCategoryId({
                    contentType: 'automations',
                    categoryId: folder.id,
                });
                subResponse.assets &&
                    subResponse.assets.length &&
                    setTimeout(() => {
                        (0, display_1.displayLine)(`Fetching Automation Response from ${folder.name}: ${subResponse.assets.length}...`, 'progress');
                    }, 2000);
                return subResponse;
            });
            const requests = yield Promise.all(chunks.map((chunk, i) => __awaiter(this, void 0, void 0, function* () {
                (0, display_1.displayLine)(`Chunk array ${i}: ${chunk.length}`, 'info');
                const results = [];
                for (const folder of chunk) {
                    results.push(yield mapFn(folder));
                }
                return results;
            })));
            const requestResponses = requests.flat().flatMap((request) => request.assets);
            const requestDefinitionResponses = requests
                .flat()
                .flatMap((request) => request.formattedAutomationDefinitions);
            const requestDependenciesResponses = requests
                .flat()
                .flatMap((request) => request.formattedAutomationDependencies);
            requestResponses && (0, display_1.displayLine)(`Total Automations: ${requestResponses.length}`, 'info');
            this.writeLocalFiles(requestResponses, 'automations');
            this.writeLocalFiles(requestDefinitionResponses, 'automation_definitions');
            this.writeLocalFiles(requestDependenciesResponses, 'automation_dependencies');
            (0, fileSystem_1.createFile)(`${rawResponsesBasePath}/automations-raw.json`, requests);
        });
        this.auditDataExtensions = (sdk) => __awaiter(this, void 0, void 0, function* () {
            try {
                const RootResp = yield sdk.sfmc.folder.search({
                    contentType: 'dataextension',
                    searchKey: 'CustomerKey',
                    searchTerm: 'dataextension_default',
                });
                const rootId = RootResp && RootResp.Results && RootResp.Results[0] && RootResp.Results[0].ID;
                const deFolders = yield sdk.sfmc.folder.getSubfoldersRecursive({
                    contentType: 'dataextension',
                    categoryId: rootId,
                });
                const folderIds = deFolders.map((folder) => ({ id: folder.ID, name: folder.Name }));
                folderIds.push(rootId);
                const chunks = (0, _utils_1.splitArrayIntoChunks)(folderIds, 10);
                (0, display_1.displayLine)('Fetching Data Extensions...', 'progress');
                (0, display_1.displayLine)(`Total Data Extension Folders: ${folderIds.length}`, 'info');
                const requests = yield Promise.all(chunks.map((chunk) => __awaiter(this, void 0, void 0, function* () {
                    const ids = chunk.map((folder) => folder.id);
                    const subRequest = yield sdk.sfmc.emailStudio.getAssetsByFolderArray(ids);
                    return subRequest;
                })));
                const requestResponses = requests.map((request) => request.Results).flat();
                requestResponses && (0, display_1.displayLine)(`Total Data Extensions: ${requestResponses.length}`, 'info');
                this.writeLocalFiles(requestResponses, 'data_extensions');
                return requestResponses;
            }
            catch (err) {
                err.message && (0, display_1.displayLine)(err.message, 'error');
                return err;
            }
        });
    }
}
exports.Audit = Audit;
