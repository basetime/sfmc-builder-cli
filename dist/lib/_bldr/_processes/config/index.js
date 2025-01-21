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
exports.Config = void 0;
const keytar_sync_1 = require("keytar-sync");
const yargs_interactive_1 = __importDefault(require("yargs-interactive"));
const _bldr_sdk_1 = require("../../../_bldr_sdk");
const store_1 = require("../../../_bldr_sdk/store");
const display_1 = require("../../../_utils/display");
const handleError_1 = require("../../../_utils/handleError");
const metrics_1 = require("../../../_utils/metrics");
const options_1 = require("../../../_utils/options");
const crypto_1 = require("../../_utils/crypto");
const state_1 = require("../state");
const { setEncryption, encrypt, decrypt } = new crypto_1.Crypto();
const { getState, allowTracking, debug } = new state_1.State();
/**
 * Handles all Configuration commands
 * @property {object} coreConfiguration
 * @property {object} stateConfiguration
 */
class Config {
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
        this.initiateConfiguration = (argv) => __awaiter(this, void 0, void 0, function* () {
            try {
                (0, display_1.displayLine)('For Web App Configurations, use the following as the Redirect URI in your Installed Package', 'info');
                (0, display_1.displayLine)('https://bldr.io/cli/sfmc/authenticate/', 'progress');
                (0, yargs_interactive_1.default)()
                    .usage('$bldr config [args]')
                    .interactive(options_1.config_new)
                    .then((configResults) => __awaiter(this, void 0, void 0, function* () {
                    // Check for encryption entries in psw mgmt
                    // Create entries if needed
                    yield setEncryption();
                    // Build Configuration Object based on user inputs
                    const configured = {
                        instance: configResults.instance,
                        configurationType: configResults.configurationType,
                        parentMID: Number(configResults.parentMID),
                        apiClientId: configResults.apiClientId,
                        apiClientSecret: configResults.apiClientSecret,
                        authURI: configResults.authURI,
                    };
                    (0, display_1.displayLine)('Testing Configuration...');
                    const sdk = yield (0, _bldr_sdk_1.initiateBldrSDK)({
                        client_id: configured.apiClientId,
                        client_secret: configured.apiClientSecret,
                        account_id: configured.parentMID,
                        auth_url: configured.authURI,
                    }, configured.instance, configured.configurationType);
                    // Throw Error if SDK Fails to Load
                    if (!sdk) {
                        (0, display_1.displayLine)('Unable to test configuration. Please review and retry.', 'error');
                        return;
                    }
                    (0, display_1.displayLine)('Gathering Business Unit Details...');
                    let instanceBusinessUnits = [];
                    // Get All Business Unit Details from provided credentials
                    const getAllBusinessUnitDetails = yield sdk.sfmc.account.getAllBusinessUnitDetails();
                    debug('Business Unit Return', 'info', getAllBusinessUnitDetails);
                    // Throw Error if there are issues with getting Business Unit Details
                    if (!Array.isArray(getAllBusinessUnitDetails) ||
                        (Array.isArray(getAllBusinessUnitDetails) && !getAllBusinessUnitDetails.length)) {
                        instanceBusinessUnits = yield sdk.sfmc.account.getBusinessUnitDetails();
                    }
                    // Isolate each Business Unit Name and MID for stored configuration
                    instanceBusinessUnits =
                        (Array.isArray(getAllBusinessUnitDetails) &&
                            getAllBusinessUnitDetails.length &&
                            getAllBusinessUnitDetails.map((bu) => {
                                return {
                                    name: bu.Name,
                                    mid: bu.ID,
                                };
                            })) ||
                            [];
                    // Encrypt Configuration object
                    const encryptedConfiguration = Object.assign(Object.assign({}, configured), { mids: instanceBusinessUnits, apiClientId: yield encrypt(configResults.apiClientId), apiClientSecret: yield encrypt(configResults.apiClientSecret) });
                    debug('Encrypted Configuration', 'info', encryptedConfiguration);
                    // Store credentials in users PSW Management
                    // OSX Keychain Access
                    // Windows Credential Manager
                    yield (0, keytar_sync_1.setPassword)('bldr', configured.instance, JSON.stringify(encryptedConfiguration));
                    const credentialCheck = yield (0, keytar_sync_1.getPassword)('bldr', configured.instance);
                    debug('Check Credentials Saved', 'info', credentialCheck);
                    // Set newly configured instance to Current State
                    yield store_1.state_conf.set({
                        instance: configured.instance,
                        parentMID: configured.parentMID,
                        activeMID: configured.parentMID,
                    });
                    (0, display_1.displayLine)(`${configured.instance} Configuration Saved`, 'success');
                    allowTracking() && (0, metrics_1.incrementMetric)('req_command_config');
                }));
            }
            catch (err) {
                err.message && (0, display_1.displayLine)(err.message, 'error');
                return err;
            }
        });
        /**
         *
         * @param argv
         */
        this.updateAvailableBusinessUnits = (instance) => __awaiter(this, void 0, void 0, function* () {
            try {
                (0, display_1.displayLine)(`Updating Business Units for ${instance}...`);
                const instanceConfig = yield this.getInstanceConfiguration(instance, false);
                const sdk = yield (0, _bldr_sdk_1.initiateBldrSDK)({
                    client_id: instanceConfig.apiClientId,
                    client_secret: instanceConfig.apiClientSecret,
                    account_id: instanceConfig.parentMID,
                    auth_url: instanceConfig.authURI,
                }, instanceConfig.instance, instanceConfig.configurationType);
                // Throw Error if SDK Fails to Load
                if (!sdk) {
                    (0, display_1.displayLine)('Unable to test configuration. Please review and retry.', 'error');
                    return;
                }
                (0, display_1.displayLine)('Gathering Business Unit Details...');
                let instanceBusinessUnits = [];
                // Get All Business Unit Details from provided credentials
                const getAllBusinessUnitDetails = yield sdk.sfmc.account.getAllBusinessUnitDetails();
                debug('Business Unit Return', 'info', getAllBusinessUnitDetails);
                // Throw Error if there are issues with getting Business Unit Details
                if (!Array.isArray(getAllBusinessUnitDetails) ||
                    (Array.isArray(getAllBusinessUnitDetails) && !getAllBusinessUnitDetails.length)) {
                    instanceBusinessUnits = yield sdk.sfmc.account.getBusinessUnitDetails();
                }
                // Isolate each Business Unit Name and MID for stored configuration
                instanceBusinessUnits =
                    (Array.isArray(getAllBusinessUnitDetails) &&
                        getAllBusinessUnitDetails.length &&
                        getAllBusinessUnitDetails.map((bu) => {
                            return {
                                name: bu.Name,
                                mid: bu.ID,
                            };
                        })) ||
                        [];
                // Encrypt Configuration object
                const encryptedConfiguration = Object.assign(Object.assign({}, instanceConfig), { mids: instanceBusinessUnits, apiClientId: yield encrypt(instanceConfig.apiClientId), apiClientSecret: yield encrypt(instanceConfig.apiClientSecret) });
                debug('Encrypted Configuration', 'info', encryptedConfiguration);
                // Store credentials in users PSW Management
                // OSX Keychain Access
                // Windows Credential Manager
                yield (0, keytar_sync_1.setPassword)('bldr', instanceConfig.instance, JSON.stringify(encryptedConfiguration));
            }
            catch (err) { }
        });
        /**
         * Retrieve configuration for a specific instance or all saved configurations
         * @param {string} instance Name of configuration to get
         * @param {boolean} show toggle the displaying of information
         * @returns {object}
         *
         */
        this.getInstanceConfiguration = (instance, show) => __awaiter(this, void 0, void 0, function* () {
            if (!instance) {
                (0, display_1.displayLine)('Please provide an instance name', 'error');
            }
            // Retrieve Configuration from PSW Manager
            let config = instance && (yield (0, keytar_sync_1.getPassword)('bldr', instance));
            if (!config) {
                throw new Error(`No configurations found for ${instance}`);
            }
            // Transform string into parse-able JSON
            let configJSON = JSON.parse(config);
            // Decrypt Client_Id and Secret
            configJSON.apiClientId = yield decrypt(configJSON.apiClientId);
            configJSON.apiClientSecret = yield decrypt(configJSON.apiClientSecret);
            if (configJSON && show) {
                // Cut string off to only show first 5 characters
                configJSON.apiClientId = configJSON.apiClientId.substring(0, 5);
                configJSON.apiClientSecret = configJSON.apiClientSecret.substring(0, 5);
                (0, display_1.displayLine)(`Instance Details (showing first 5 characters of credentials)`, 'info');
                (0, display_1.displayObject)(configJSON);
                configJSON.mids.forEach((mid) => (0, display_1.displayObject)(mid));
            }
            return configJSON;
        });
        /**
         * Retrieve and List Instance Names, Full Details
         * @param {object} argv
         */
        this.listInstanceConfiguration = (argv) => __awaiter(this, void 0, void 0, function* () {
            // If a value is provided pass to the getInstanceConfiguration function to retrieve and display
            if ((argv.l && typeof argv.l === 'string') || (argv.list && typeof argv.list === 'string')) {
                const instanceStr = argv.l || argv.list || '';
                this.getInstanceConfiguration(instanceStr, true);
            }
            // If no value is provided get all stored credentials and pull the instance names
            const instanceArr = (yield (0, keytar_sync_1.findCredentials)('bldr'))
                .map((item) => {
                if (item.account !== 'io' && item.account !== 'salty') {
                    return item.account;
                }
            })
                .filter(Boolean) || [];
            if (instanceArr.length) {
                (0, display_1.displayLine)(`Configured Instances`, 'info');
                (0, display_1.displayArrayOfStrings)(instanceArr);
            }
            else {
                (0, display_1.displayLine)(`There are no Configured Instances`, 'info');
            }
        });
        /**
         * Remove configuration by Instance Name
         *
         * @param {string} argv
         * @returns
         */
        this.removeConfiguration = (argv) => __awaiter(this, void 0, void 0, function* () {
            try {
                if ((argv.r && typeof argv.r !== 'string') || (argv.remove && typeof argv.remove !== 'string')) {
                    (0, display_1.displayLine)(`Please provide an Instance Name to remove`, 'error');
                    return;
                }
                // Retrieve Instance Name from input
                const instance = argv.r ? argv.r : argv.remove ? argv.remove : null;
                if (!instance) {
                    (0, display_1.displayLine)(`Unable to find Instance Name in your request, please try again`, 'error');
                    return;
                }
                // Display configuration for verification
                yield this.getInstanceConfiguration(instance, true);
                // Verify the deletion of the displayed configuration
                (0, yargs_interactive_1.default)()
                    .usage('$0 <command> [args]')
                    .interactive((0, options_1.config_remove)(instance))
                    .then((result) => __awaiter(this, void 0, void 0, function* () {
                    if (!result.confirmDelete) {
                        return;
                    }
                    // Delete entry for instance
                    yield (0, keytar_sync_1.deletePasswordSync)('bldr', instance);
                    // Check that entry no longer exists to confirm delete
                    let checkDeletion = yield (0, keytar_sync_1.getPasswordSync)('bldr', instance);
                    !checkDeletion
                        ? (0, display_1.displayLine)(`${instance} was Deleted Successfully.`, 'success')
                        : (0, display_1.displayLine)(`${instance} was Not Deleted.`, 'error');
                }));
                return;
            }
            catch (err) {
                return (0, handleError_1.handleError)(err.message);
            }
        });
        /**
         * Set a configured Instance as your target
         *
         * @param argv
         * @returns
         */
        this.setConfiguration = (argv) => __awaiter(this, void 0, void 0, function* () {
            try {
                const instanceToSet = argv.s || argv.set;
                const midToSet = argv.m || argv.mid || null;
                if (typeof instanceToSet !== 'string') {
                    (0, display_1.displayLine)('Please provide an Instance Name to Set.', 'error');
                    return;
                }
                const clientConfig = yield this.getInstanceConfiguration(instanceToSet);
                if (!clientConfig) {
                    throw new Error(`${instanceToSet} is not Configured`);
                }
                if (midToSet && !clientConfig.mids.find((bu) => bu.mid === midToSet)) {
                    throw new Error(`${midToSet} is not a Valid MID`);
                }
                const initState = {
                    instance: instanceToSet,
                    parentMID: clientConfig.parentMID,
                    activeMID: midToSet || clientConfig.parentMID,
                };
                store_1.state_conf.set(initState);
                (0, display_1.displayLine)(`${instanceToSet} has been set to target instance`, 'success');
                (0, display_1.displayObject)(initState);
            }
            catch (err) {
                debug('Config Err', 'error', err);
                (0, display_1.displayLine)(`There was an error setting your target instance`, 'error');
                (0, display_1.displayLine)(err.message, 'error');
            }
        });
    }
}
exports.Config = Config;
