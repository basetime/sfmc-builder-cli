#!/usr/bin/env node
"use strict";
/**
 * Before making changes/saving this file update vsCode settings
 *
 * source.organizeImports must be set to false before saving
 * updates cause errors with this file
 *
 * "editor.codeActionsOnSave": {
    "source.organizeImports": false
  },
 *
 */
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
const yargs_1 = __importDefault(require("yargs"));
const version_1 = require("../lib/_bldr_sdk/version");
// Initiate all route switches
// const InitSwitch = require('../lib/_controllers/init')
const _context_1 = require("../lib/_controllers/_context");
const config_1 = require("../lib/_controllers/config");
const add_1 = require("../lib/_controllers/add");
const stash_1 = require("../lib/_controllers/stash");
const push_1 = require("../lib/_controllers/push");
const status_1 = require("../lib/_controllers/status");
const package_1 = require("../lib/_controllers/package");
const install_1 = require("../lib/_controllers/install");
const display_1 = require("../lib/_utils/display");
const deploy_1 = require("../lib/_controllers/deploy");
const initiate_1 = require("../lib/_controllers/initiate");
const state_1 = require("../lib/_bldr/_processes/state");
const crypto_1 = require("../lib/_bldr/_utils/crypto");
const config_2 = require("../lib/_bldr/_processes/config");
const audit_1 = require("../lib/_controllers/audit");
const { setEncryption } = new crypto_1.Crypto();
const { getInstanceConfiguration } = new config_2.Config();
const { checkForTracking, getState, debug } = new state_1.State();
// Parse requests and input arguments
const userInput = yargs_1.default;
const req = userInput.argv._[0] ? userInput.argv._[0].toLowerCase() : null;
const argv = userInput.argv;
/**
 * Initiate CLI application and route requests
 *
 * @param {string} req
 * @param {object} argv
 * @param {object} store
 */
const initCLI = (req, argv) => __awaiter(void 0, void 0, void 0, function* () {
    yield checkForTracking();
    debug('User Request', 'info', { request: req, argument: argv });
    if (!req) {
        if (argv.v) {
            (0, display_1.displayLine)(`bldr version: ${version_1.version}`, 'info');
        }
        if (argv.h) {
            (0, display_1.displayLine)('config', 'success');
            (0, display_1.displayObject)({
                '-n, --new                          ': 'Create New Configuration',
                '>> Web App Redirect URI            ': 'https://bldr.io/cli/sfmc/authenticate/',
                '<instance name>                    ': 'View Instance Configuration',
                '-l, --list                         ': 'List all Configurations',
                '-s --set                           ': 'Set Target Configuration to Use',
                '>> -m, --mid                       ': 'Set Target MID to Use',
                '-r, --remove                       ': 'Remove Configuration',
                '--verbose                          ': 'Toggle Verbose Messaging',
                '--debug                            ': 'Toggle Debugging Mode',
                '--analytics                        ': 'Toggle Analytics Capturing',
                '--clear-session                    ': 'Resets Current Session and Forces Token Refresh',
            });
            (0, display_1.displayLine)('status', 'success');
            (0, display_1.displayObject)({
                '                                   ': 'Show Current State and Staged Files',
            });
            (0, display_1.displayLine)('stash', 'success');
            (0, display_1.displayObject)({
                '-c                                 ': 'Clear All Staged Files',
            });
            (0, display_1.displayLine)('init', 'success');
            (0, display_1.displayObject)({
                '--cb                               ': 'Initiate Content Builder Project',
                '--de                               ': 'Initiate Data Extension',
                '--env-only                         ': 'Setup Environment Variables for Project',
                '--update-env-keys                  ': 'Update .sfmc.env.json keys found in content',
            });
            (0, display_1.displayLine)('search', 'success');
            (0, display_1.displayLine)('Search requires the use of context flags.', 'progress');
            (0, display_1.displayObject)({
                '--cb -f <search term>              ': 'Content Builder Folders',
                '--cb -a <search term>              ': 'Content Builder Assets',
                '--cb -f:shared <search term>       ': 'Shared Content Builder Folders',
                '--cb -a:shared <search term>       ': 'Shared Content Builder Assets',
                '--as -f <search term>              ': 'Automation Folders',
                '--as -a <search term>              ': 'Automation Assets',
                '--as -f:sql  <search term>         ': 'SQL Activity Folders',
                '--as -a:sql  <search term>         ': 'SQL Activity Assets',
                '--as -f:ssjs <search term>         ': 'SSJS Activity Folders',
                '--as -a:ssjs <search term>         ': 'SSJS Activity Assets',
                '--de -f <search term>              ': 'Data Extension Folders',
                '--de -a <search term>              ': 'Data Extension Assets',
                '--de -f:shared <search term>       ': 'Shared Data Extension Folders',
                '--de -a:shared <search term>       ': 'Shared Data Extension Assets',
            });
            (0, display_1.displayLine)('clone', 'success');
            (0, display_1.displayLine)('Clone requires the use of context flags.', 'progress');
            (0, display_1.displayObject)({
                '--cb -f <folder id>                ': 'Content Builder Folder ID to Clone',
                '--cb -a <asset id>                 ': 'Content Builder Asset ID to Clone',
                '--cb -f:shared <folder id>         ': 'Shared Content Builder Folder ID to Clone',
                '--cb -a:shared <asset id>          ': 'Shared Content Builder Asset ID to Clone',
                '--as -f <folder id>                ': 'Automation Folder ID to Clone',
                '--as -a <object id>                ': 'Automation Object ID to Clone',
                '--as -f:sql  <folder id>           ': 'SQL Activity Folders',
                '--as -a:sql  <definition id>       ': 'SQL Activity Assets',
                '--as -f:ssjs <folder id>           ': 'SSJS Activity Folders',
                '--as -a:ssjs <definition id>       ': 'SSJS Activity Assets',
                '--de -f <folder id>                ': 'Data Extension Folder Id to Clone',
                '--de -a <customer key>             ': 'Data Extension Customer Key to Clone',
                '--de -f:shared <folder id>         ': 'Shared Data Extension Folder Id to Clone',
                '--de -a:shared <customer key>      ': 'Shared Data Extension Customer Key to Clone',
            });
            (0, display_1.displayLine)('add', 'success');
            (0, display_1.displayObject)({
                '.                                  ': 'Add All Assets to the Stash to be Pushed into SFMC',
                '<file path>                        ': 'Add One or Multiple Assets to the Stash to be Pushed into SFMC',
                '                                   ': 'New Assets to be created will prompt for selection of asset type',
            });
            (0, display_1.displayLine)('push', 'success');
            (0, display_1.displayObject)({
                '                                   ': 'Update or Create Assets/Folders in SFMC',
            });
            (0, display_1.displayLine)('package [beta]', 'success');
            (0, display_1.displayObject)({
                '                                   ': 'Package cloned files',
            });
            (0, display_1.displayLine)('install [beta]', 'success');
            (0, display_1.displayObject)({
                '<github url>                       ': 'Download package files from repository',
            });
            (0, display_1.displayLine)('deploy [beta]', 'success');
            (0, display_1.displayObject)({
                '--sfmc-only                        ': 'Create files in SFMC only [only recommended for flat packages]',
                '--local-only                       ': 'Create files in locally only [only recommended for flat packages]',
                '                                   ': 'Create local files and push to SFMC',
            });
        }
    }
    else {
        if (Object.values(argv).includes(':shared')) {
            debug('Checking Shared Request', 'info', '');
            // If authObject is not passed use the current set credentials to initiate SDK
            const currentState = yield getState();
            const stateInstance = currentState.instance;
            const activeMID = currentState.activeMID;
            const stateConfiguration = yield getInstanceConfiguration(stateInstance);
            const command = argv._ && argv._[0];
            debug('Current State', 'info', currentState);
            debug('Current Configuration', 'info', Object.assign(Object.assign({}, stateConfiguration), { apiClientId: stateConfiguration.apiClientId.substring(0, 5), apiClientSecret: stateConfiguration.apiClientSecret.substring(0, 5) }));
            if (activeMID &&
                stateConfiguration &&
                stateConfiguration.parentMID &&
                stateConfiguration.parentMID !== activeMID &&
                ['search', 'clone'].includes(command)) {
                (0, display_1.displayLine)(`Shared ${command} must be done from Parent Business Unit`, 'info');
                (0, display_1.displayLine)(`Use Command 'bldr config -s ${stateInstance} -m ${stateConfiguration.parentMID}' and retry request`, 'info');
                return;
            }
        }
        switch (req) {
            case 'init':
                (0, initiate_1.InitSwitch)(argv);
                break;
            /**
             * Config route handles all CLI configuration of SFMC Instance
             * See README for config details
             */
            case 'config':
                (0, config_1.ConfigSwitch)(req, argv);
                break;
            /**
             * Add files in bulk or by filepath to the stash.json file
             */
            case 'add':
                (0, add_1.AddSwitch)(req, argv);
                break;
            /**
             * Works with Stash operations
             */
            case 'stash':
                (0, stash_1.StashSwitch)(argv);
                break;
            /**
             * Displays current State and Staged Files
             */
            case 'status':
                (0, status_1.StatusSwitch)();
                break;
            /**
             * Format and push Staged files into current State SFMC Instance
             */
            case 'push':
                (0, push_1.PushSwitch)();
                break;
            /**
             * Package Files
             */
            case 'package':
                (0, package_1.PackageSwitch)();
                break;
            case 'install':
                (0, install_1.InstallSwitch)(argv);
                break;
            case 'deploy':
                (0, deploy_1.DeploySwitch)(argv);
                break;
            case 'audit':
                (0, audit_1.AuditSwitch)(argv);
                break;
            // case 'patch':
            //     patchSwitch.switch(argv);
            //     break;
            // /**
            //  * Default handles all context specific routes
            //  * Context specific routes are located in utils/Blueprint/context/:context
            //  */
            default:
                (0, _context_1.ContextSwitch)(req, argv);
        }
    }
});
initCLI(req, argv);
