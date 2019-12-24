export default {
    type: 'object',
    properties: {
        artifacts: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    root: { type: 'string' },
                    patterns: {
                        type: 'array',
                        items: { type: 'string' }
                    }
                },
                required: ['name', 'patterns']
            }
        },
        bucket: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                fromExport: { type: 'string' },
            },
            oneOf: [
                { required: ['name'] },
                { required: ['fromExport'] },
            ],
        },
        stacks: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    artifactNamesConsumed: {
                        type: 'array',
                        items: { type: 'string' }
                    },
                    capabilities: {
                        type: 'array',
                        items: { type: 'string' }
                    },
                    name: { type: 'string' },
                    parameters: { type: 'object' },
                    templatePath: { type: 'string' }
                },
                required: ['artifactNamesConsumed', 'capabilities', 'name', 'parameters', 'templatePath' ]
            }
        }
    },
    required: ['artifacts', 'bucket', 'stacks']
};