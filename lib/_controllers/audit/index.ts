import { Audit } from '../../_bldr/_processes/audit';
import { Argv } from '../../_types/Argv';

const { initiateAudit } = new Audit();
/**
 * Flag routing for Config command
 *
 * @param {object} argv
 * @param {object} store
 *
 */
const AuditSwitch = async (argv: Argv) => {
    /**
     * Configure New Instance
     */
    await initiateAudit(argv);

    return;
};

export { AuditSwitch };
