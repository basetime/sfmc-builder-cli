#!/usr/bin/env node
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

import yargs from 'yargs';
import { version } from '../lib/_bldr_sdk/version';
// Initiate all route switches
// const InitSwitch = require('../lib/_controllers/init')
import { ContextSwitch } from '../lib/_controllers/_context';
import { ConfigSwitch } from '../lib/_controllers/config';
import { AddSwitch } from '../lib/_controllers/add';
import { StashSwitch } from '../lib/_controllers/stash';
import { PushSwitch } from '../lib/_controllers/push';
import { StatusSwitch } from '../lib/_controllers/status';
import { PackageSwitch } from '../lib/_controllers/package';
import { InstallSwitch } from '../lib/_controllers/install';
import { displayLine, displayObject } from '../lib/_utils/display';
import { DeploySwitch } from '../lib/_controllers/deploy';
import { InitSwitch } from '../lib/_controllers/initiate';
import { State } from '../lib/_bldr/_processes/state';
import { Crypto } from '../lib/_bldr/_utils/crypto';
import { Config } from '../lib/_bldr/_processes/config';
import { AuditSwitch } from '../lib/_controllers/audit';

const { setEncryption } = new Crypto();
const { getInstanceConfiguration } = new Config();
const { checkForTracking, getState, debug } = new State();

// Parse requests and input arguments

const userInput: any = yargs;
const req = userInput.argv._[0] ? userInput.argv._[0].toLowerCase() : null;
const argv = userInput.argv;

/**
 * Initiate CLI application and route requests
 *
 * @param {string} req
 * @param {object} argv
 * @param {object} store
 */
const initCLI = async (req: string, argv: any) => {
    await checkForTracking();
    debug('User Request', 'info', { request: req, argument: argv });

    if (!req) {
        if (argv.v) {
            displayLine(`bldr version: ${version}`, 'info');
        }

        if (argv.h) {
            displayLine('config', 'success');
            displayObject({
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

            displayLine('status', 'success');
            displayObject({
                '                                   ': 'Show Current State and Staged Files',
            });

            displayLine('stash', 'success');
            displayObject({
                '-c                                 ': 'Clear All Staged Files',
            });

            displayLine('init', 'success');
            displayObject({
                '--cb                               ': 'Initiate Content Builder Project',
                '--de                               ': 'Initiate Data Extension',
                '--env-only                         ': 'Setup Environment Variables for Project',
                '--update-env-keys                  ': 'Update .sfmc.env.json keys found in content',
            });

            displayLine('search', 'success');
            displayLine('Search requires the use of context flags.', 'progress');
            displayObject({
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

            displayLine('clone', 'success');
            displayLine('Clone requires the use of context flags.', 'progress');
            displayObject({
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

            displayLine('add', 'success');
            displayObject({
                '.                                  ': 'Add All Assets to the Stash to be Pushed into SFMC',
                '<file path>                        ': 'Add One or Multiple Assets to the Stash to be Pushed into SFMC',
                '                                   ':
                    'New Assets to be created will prompt for selection of asset type',
            });

            displayLine('push', 'success');
            displayObject({
                '                                   ': 'Update or Create Assets/Folders in SFMC',
            });

            displayLine('package [beta]', 'success');
            displayObject({
                '                                   ': 'Package cloned files',
            });

            displayLine('install [beta]', 'success');
            displayObject({
                '<github url>                       ': 'Download package files from repository',
            });

            displayLine('deploy [beta]', 'success');
            displayObject({
                '--sfmc-only                        ': 'Create files in SFMC only [only recommended for flat packages]',
                '--local-only                       ':
                    'Create files in locally only [only recommended for flat packages]',
                '                                   ': 'Create local files and push to SFMC',
            });
        }
    } else {
        if (Object.values(argv).includes(':shared')) {
            debug('Checking Shared Request', 'info', '');
            // If authObject is not passed use the current set credentials to initiate SDK
            const currentState = await getState();
            const stateInstance = currentState.instance;
            const activeMID = currentState.activeMID;
            const stateConfiguration = await getInstanceConfiguration(stateInstance);
            const command = argv._ && argv._[0];
            debug('Current State', 'info', currentState);
            debug('Current Configuration', 'info', {
                ...stateConfiguration,
                apiClientId: stateConfiguration.apiClientId.substring(0, 5),
                apiClientSecret: stateConfiguration.apiClientSecret.substring(0, 5),
            });

            if (
                activeMID &&
                stateConfiguration &&
                stateConfiguration.parentMID &&
                stateConfiguration.parentMID !== activeMID &&
                ['search', 'clone'].includes(command)
            ) {
                displayLine(`Shared ${command} must be done from Parent Business Unit`, 'info');
                displayLine(
                    `Use Command 'bldr config -s ${stateInstance} -m ${stateConfiguration.parentMID}' and retry request`,
                    'info'
                );
                return;
            }
        }
        switch (req) {
            case 'init':
                InitSwitch(argv);
                break;
            /**
             * Config route handles all CLI configuration of SFMC Instance
             * See README for config details
             */
            case 'config':
                ConfigSwitch(req, argv);
                break;

            /**
             * Add files in bulk or by filepath to the stash.json file
             */
            case 'add':
                AddSwitch(req, argv);
                break;

            /**
             * Works with Stash operations
             */
            case 'stash':
                StashSwitch(argv);
                break;

            /**
             * Displays current State and Staged Files
             */
            case 'status':
                StatusSwitch();
                break;

            /**
             * Format and push Staged files into current State SFMC Instance
             */
            case 'push':
                PushSwitch();
                break;
            /**
             * Package Files
             */
            case 'package':
                PackageSwitch();
                break;

            case 'install':
                InstallSwitch(argv);
                break;

            case 'deploy':
                DeploySwitch(argv);
                break;

            case 'audit':
                AuditSwitch(argv);
                break;

            // case 'patch':
            //     patchSwitch.switch(argv);
            //     break;
            // /**
            //  * Default handles all context specific routes
            //  * Context specific routes are located in utils/Blueprint/context/:context
            //  */
            default:
                ContextSwitch(req, argv);
        }
    }
};

initCLI(req, argv);
