module.exports = [
    {
        root: 'Data Extensions',
        customerKey: "dataExtension_default",
        context: 'dataExtension',
        categoryType: 'dataextension',
        scope: ['folders', 'assets'],
    },
    {
        root: 'Shared Data Extensions',
        context: 'sharedDataExtension',
        categoryType: 'shared_dataextension',
        scope: ['folders', 'assets'],
    },
    {
        root: 'Content Builder',
        context: 'contentBuilder',
        categoryType: 'asset',
        scope: ['folders', 'assets'],
    },
    {
        root: 'Shared Content',
        context: 'sharedContent',
        categoryType: 'asset',
        scope: ['folders', 'assets'],
    },
    {
        root: 'Automation Studio',
        context: 'automationStudio',
        categoryType: 'automations',
        scope: ['folders', 'assets'],
    },
];
