#!/usr/bin/env node
import yargs from 'yargs'
import {
    stashInit,
    stateInit
} from '../lib/_bldr_sdk/store'

// Initiate all route switches
const InitSwitch = require('../lib/_controllers/init')
import { ConfigSwitch } from '../lib/_controllers/config'

// const contextSwitch = require('../lib/context/contextSwitch');
// const configSwitch = require('../lib/config/switch');
// const addSwitch = require('../lib/add/switch');
// const pushSwitch = require('../lib/push/switch');
// const packageSwitch = require('../lib/package/switch');
// const deploySwitch = require('../lib/deploy/switch');
// const installSwitch = require('../lib/install/switch');
// const stashSwitch = require('../lib/stash/switch');
// const statusSwitch = require('../lib/status/switch');
// // const initSwitch = require('../lib/_controllers/init/switch');
// const patchSwitch = require('../lib/patch/switch');

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
const initCLI = async (
    req: string,
    argv: any,
) => {
    if (!req) {
        // If no request is provided show help
        // store.help.init();
    } else {

        switch (req) {
            case 'init':
                // InitSwitch(req, argv, bldrSDK);
                break;
            // /**
            //  * Config route handles all CLI configuration of SFMC Instance\
            //  * See README for config details
            //  */
            case 'config':
                ConfigSwitch(req, argv);
                break;

            // /**
            //  * Add files in bulk or by filepath to the stash.json file
            //  */
            // case 'add':
            //     blueprint = await blueprintInit.set(null, store);
            //     if (blueprint) addSwitch.switch(req, argv, blueprint, store);
            //     break;

            // /**
            //  * Works with Stash operations
            //  */
            // case 'stash':
            //     blueprint = await blueprintInit.set(null, store);
            //     if (blueprint) stashSwitch.switch(req, argv, blueprint, store);
            //     break;

            // /**
            //  * Displays current State and Staged Files
            //  */
            // case 'status':
            //     blueprint = await blueprintInit.set(null, store);
            //     if (blueprint) statusSwitch.switch(req, argv, blueprint, store);
            //     break;

            // /**
            //  * Format and push Staged files into current State SFMC Instance
            //  */
            // case 'push':
            //     blueprint = await blueprintInit.set(null, store);
            //     if (blueprint) pushSwitch.switch(req, argv, blueprint, store);
            //     break;
            // /**
            //  * Package Files
            //  */
            // case 'package':
            //     blueprint = await blueprintInit.set(null, store);
            //     if (blueprint)
            //         packageSwitch.switch(req, argv, blueprint, store);
            //     break;

            // case 'install':
            //     blueprint = await blueprintInit.set(null, store);
            //     if (blueprint) installSwitch.switch(req, argv, blueprint);
            //     break;

            // case 'deploy':
            //     blueprint = await blueprintInit.set(null, store);
            //     if (blueprint) deploySwitch.switch(req, argv, blueprint, store);
            //     break;

            // case 'patch':
            //     patchSwitch.switch(argv);
            //     break;
            // /**
            //  * Default handles all context specific routes
            //  * Context specific routes are located in utils/Blueprint/context/:context
            //  */
            // default:
            //     blueprint = await blueprintInit.set(null, store);
            //     if (blueprint)
            //         contextSwitch.switch(req, argv, blueprint, store);
        }
    }
};

initCLI(req, argv);
