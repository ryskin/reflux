/**
 * Condition Node - Evaluates conditions for branching logic
 * Returns true/false based on condition evaluation
 */
import { Service, ServiceBroker } from 'moleculer';

export default class ConditionNode extends Service {
  constructor(broker: ServiceBroker) {
    super(broker);

    this.parseServiceSchema({
      name: '1.0.0.nodes.condition.execute',
      actions: {
        execute: {
          params: {
            condition: 'string', // The condition to evaluate (e.g., "value > 10", "status === 'active'")
          },
          async handler(ctx: any) {
            const { condition } = ctx.params;

            // Extract workflow context from meta
            const workflowInputs = ctx.meta?.inputs || {};
            const previousNodes = ctx.meta?.nodes || {};

            this.logger.info(`[Condition] Evaluating: ${condition}`);

            try {
              // Create execution context for condition evaluation
              const inputs = {
                ...workflowInputs,
                ...Object.fromEntries(
                  Object.entries(previousNodes).map(([key, value]: [string, any]) => [
                    key,
                    value.output
                  ])
                )
              };

              // Evaluate condition in safe context
              const result = this.evaluateCondition(condition, inputs);

              this.logger.info(`[Condition] Result: ${result}`);

              return { result };
            } catch (error: any) {
              this.logger.error(`[Condition] Evaluation failed:`, error.message);
              throw new Error(`Condition evaluation failed: ${error.message}`);
            }
          },
        },
      },
    });
  }

  /**
   * Safely evaluate a condition expression
   * Supports:
   * - Comparisons: >, <, >=, <=, ===, !==
   * - Logical operators: &&, ||, !
   * - Property access: inputs.value, nodeId.field
   */
  private evaluateCondition(condition: string, context: Record<string, any>): boolean {
    // Simple conditions without operators
    if (!condition.includes('>') && !condition.includes('<') &&
        !condition.includes('===') && !condition.includes('!==') &&
        !condition.includes('&&') && !condition.includes('||')) {
      // Direct boolean value or property
      const value = this.resolveValue(condition.trim(), context);
      return Boolean(value);
    }

    // Handle comparison operators
    const operators = ['===', '!==', '>=', '<=', '>', '<'];
    for (const op of operators) {
      if (condition.includes(op)) {
        const [left, right] = condition.split(op).map(s => s.trim());
        const leftVal = this.resolveValue(left, context);
        const rightVal = this.resolveValue(right, context);

        switch (op) {
          case '===': return leftVal === rightVal;
          case '!==': return leftVal !== rightVal;
          case '>': return Number(leftVal) > Number(rightVal);
          case '<': return Number(leftVal) < Number(rightVal);
          case '>=': return Number(leftVal) >= Number(rightVal);
          case '<=': return Number(leftVal) <= Number(rightVal);
        }
      }
    }

    // Handle logical operators (&&, ||)
    if (condition.includes('&&')) {
      const parts = condition.split('&&').map(s => s.trim());
      return parts.every(part => this.evaluateCondition(part, context));
    }

    if (condition.includes('||')) {
      const parts = condition.split('||').map(s => s.trim());
      return parts.some(part => this.evaluateCondition(part, context));
    }

    // Handle negation (!)
    if (condition.startsWith('!')) {
      return !this.evaluateCondition(condition.substring(1).trim(), context);
    }

    return false;
  }

  /**
   * Resolve a value from context
   * Supports: numbers, strings (quoted), booleans, property paths
   */
  private resolveValue(expr: string, context: Record<string, any>): any {
    // Number literal
    if (/^-?\d+\.?\d*$/.test(expr)) {
      return Number(expr);
    }

    // String literal (quoted)
    if ((expr.startsWith('"') && expr.endsWith('"')) ||
        (expr.startsWith("'") && expr.endsWith("'"))) {
      return expr.slice(1, -1);
    }

    // Boolean literal
    if (expr === 'true') return true;
    if (expr === 'false') return false;
    if (expr === 'null') return null;
    if (expr === 'undefined') return undefined;

    // Property path (e.g., "inputs.value" or "nodeId.field.nested")
    const parts = expr.split('.');
    let current = context;

    for (const part of parts) {
      if (current === undefined || current === null) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }
}
