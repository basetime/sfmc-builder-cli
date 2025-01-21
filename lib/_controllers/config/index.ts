import { Config } from '../../_bldr/_processes/config';
import { State } from '../../_bldr/_processes/state';
import { Argv } from '../../_types/Argv';

const { toggleVerbose, toggleTracking, toggleDebug, clearSession } = new State();

const {
    initiateConfiguration,
    getInstanceConfiguration,
    listInstanceConfiguration,
    removeConfiguration,
    setConfiguration,
    updateAvailableBusinessUnits,
} = new Config();
/**
 * Flag routing for Config command
 *
 * @param {string} req
 * @param {object} argv
 * @param {object} store
 *
 */
const ConfigSwitch = async (req: any, argv: Argv) => {
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
};

export { ConfigSwitch };
