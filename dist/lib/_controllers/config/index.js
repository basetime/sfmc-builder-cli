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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigSwitch = void 0;
const config_1 = require("../../_bldr/_processes/config");
const state_1 = require("../../_bldr/_processes/state");
const { toggleVerbose, toggleTracking, toggleDebug, clearSession } = new state_1.State();
const { initiateConfiguration, getInstanceConfiguration, listInstanceConfiguration, removeConfiguration, setConfiguration, updateAvailableBusinessUnits, } = new config_1.Config();
/**
 * Flag routing for Config command
 *
 * @param {string} req
 * @param {object} argv
 * @param {object} store
 *
 */
const ConfigSwitch = (req, argv) => __awaiter(void 0, void 0, void 0, function* () {
    /**
     * Configure New Instance
     */
    if (argv.n || argv.new) {
        return initiateConfiguration(argv);
    }
    /**
    * Update Configuration
    */
    if (argv.u || argv.update) {
        return argv._ && argv._[1] && updateAvailableBusinessUnits(argv._[1]);
    }
    /**
     * Get Configuration by Instance key
     * argv._[0] is the command
     */
    if (argv._ && argv._[1]) {
        return getInstanceConfiguration(argv._[1], true);
    }
    /**
     * List all Configurations
     */
    if (argv.l || argv.list) {
        return listInstanceConfiguration(argv);
    }
    /**
     * Remove Configuration by Instance Key
     */
    if (argv.r || argv.remove) {
        return removeConfiguration(argv);
    }
    /**
     * Set State Instance
     */
    if (argv.s || argv.set) {
        return setConfiguration(argv);
    }
    if (argv.verbose) {
        return toggleVerbose();
    }
    if (argv.analytics) {
        return toggleTracking();
    }
    if (argv.debug) {
        return toggleDebug();
    }
    if (argv['clear-session']) {
        return clearSession();
    }
    return;
});
exports.ConfigSwitch = ConfigSwitch;
