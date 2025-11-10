/**
 * Transform Node - Executes JavaScript code for data transformation
 * Uses VM2 for safe sandboxed execution
 */
import { Service, ServiceBroker } from 'moleculer';
import { VM } from 'vm2';

export default class TransformNode extends Service {
  constructor(broker: ServiceBroker) {
    super(broker);

    this.parseServiceSchema({
      name: '1.0.0.nodes.transform.execute',
      actions: {
        execute: {
          params: {
            code: 'string',
          },
          async handler(ctx: any) {
            const { code } = ctx.params;

            // Extract workflow context from meta
            // Meta contains: { runId, stepId, inputs, nodes }
            const workflowInputs = ctx.meta?.inputs || {};
            const previousNodes = ctx.meta?.nodes || {};

            this.logger.info(`[Transform] Executing code in sandboxed VM`);

            try {
              // Create execution context for the code
              const inputs = {
                ...workflowInputs,
                ...Object.fromEntries(
                  Object.entries(previousNodes).map(([key, value]: [string, any]) => [
                    key,
                    value.output
                  ])
                )
              };

              const outputs: Record<string, any> = {};

              // Create sandboxed VM with strict security
              const vm = new VM({
                timeout: 5000, // 5 second max execution time
                sandbox: {
                  inputs,
                  outputs,
                  // Allow safe built-ins
                  JSON,
                  Math,
                  Date,
                  String,
                  Number,
                  Boolean,
                  Array,
                  Object,
                },
                eval: false, // Disable eval
                wasm: false, // Disable WebAssembly
                fixAsync: false, // Don't allow async
              });

              // Execute code in isolated sandbox
              vm.run(code);

              this.logger.info(`[Transform] Code executed successfully in sandbox`);

              return outputs;
            } catch (error: any) {
              this.logger.error(`[Transform] Execution failed:`, error.message);
              throw new Error(`Transform execution failed: ${error.message}`);
            }
          },
        },
      },
    });
  }
}
