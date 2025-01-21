import { Argv } from '../../_types/Argv';
import { ContentBuilderSwitch } from './contentBuilder';
import { AutomationStudioSwitch } from './automationStudio';
import { DataExtensionSwitch } from './dataExtension';
/*
 * Flag routing for Config command
 *
 * @param {string} req
 * @param {object} argv
 * @param {object} store
 *
 */
const ContextSwitch = async (req: any, argv: Argv) => {
    /**
     * Configure New Instance
     */
    if (
        !argv['content-builder'] &&
        !argv.cb &&
        !argv['automation-studio'] &&
        !argv.as &&
        !argv.de &&
        !argv['data-extension'] &&
        !argv.ts &&
        !argv['triggered-send']
    ) {
        throw new Error('Please include a context flag');
    }

    if (argv.cb || argv['content-builder']) {
        ContentBuilderSwitch(req, argv);
    }

    if (argv.as || argv['automation-studio']) {
        AutomationStudioSwitch(req, argv);
    }

    if (argv.de || argv['data-extension']) {
        DataExtensionSwitch(req, argv);
    }

    if (argv.ts || argv['triggered-send']) {
        console.log('triggered send');
    }

    return;
};

export { ContextSwitch };
