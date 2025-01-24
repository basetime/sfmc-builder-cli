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
exports.AuditSwitch = void 0;
const audit_1 = require("../../_bldr/_processes/audit");
const { initiateAudit } = new audit_1.Audit();
/**
 * Flag routing for Config command
 *
 * @param {object} argv
 * @param {object} store
 *
 */
const AuditSwitch = (argv) => __awaiter(void 0, void 0, void 0, function* () {
    /**
     * Configure New Instance
     */
    yield initiateAudit(argv);
    return;
});
exports.AuditSwitch = AuditSwitch;
