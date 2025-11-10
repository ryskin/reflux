#!/usr/bin/env node
/**
 * CLI tool for migrating n8n workflows to REFLUX
 *
 * Usage:
 *   npx reflux-migrate <n8n-workflow.json>
 *   npx reflux-migrate --dir <workflows-directory>
 */

import * as fs from 'fs';
import * as path from 'path';
import { transformN8nWorkflow } from './n8n-transformer';
import { N8nWorkflow } from './n8n-types';

interface MigrationOptions {
  input?: string;
  dir?: string;
  output?: string;
  verbose?: boolean;
}

class MigrationCLI {
  async run(args: string[]) {
    const options = this.parseArgs(args);

    console.log('🔄 REFLUX n8n Migration Tool\n');

    if (options.dir) {
      await this.migrateDirectory(options);
    } else if (options.input) {
      await this.migrateFile(options);
    } else {
      this.showHelp();
      process.exit(1);
    }
  }

  private parseArgs(args: string[]): MigrationOptions {
    const options: MigrationOptions = {};

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      switch (arg) {
        case '--dir':
        case '-d':
          options.dir = args[++i];
          break;

        case '--output':
        case '-o':
          options.output = args[++i];
          break;

        case '--verbose':
        case '-v':
          options.verbose = true;
          break;

        case '--help':
        case '-h':
          this.showHelp();
          process.exit(0);
          break;

        default:
          if (!arg.startsWith('-')) {
            options.input = arg;
          }
      }
    }

    return options;
  }

  private async migrateFile(options: MigrationOptions) {
    if (!options.input) {
      console.error('❌ No input file specified');
      process.exit(1);
    }

    const inputPath = path.resolve(options.input);

    if (!fs.existsSync(inputPath)) {
      console.error(`❌ File not found: ${inputPath}`);
      process.exit(1);
    }

    console.log(`📄 Migrating: ${path.basename(inputPath)}`);

    try {
      // Read n8n workflow
      const n8nWorkflowJson = fs.readFileSync(inputPath, 'utf-8');
      const n8nWorkflow: N8nWorkflow = JSON.parse(n8nWorkflowJson);

      // Transform
      const result = transformN8nWorkflow(n8nWorkflow);

      // Show results
      this.printResults(result, options.verbose);

      if (result.success && result.workflow) {
        // Determine output path
        const outputPath = options.output
          ? path.resolve(options.output)
          : inputPath.replace('.json', '.reflux.json');

        // Write REFLUX workflow
        fs.writeFileSync(
          outputPath,
          JSON.stringify(result.workflow, null, 2),
          'utf-8'
        );

        console.log(`\n✅ Migrated workflow saved to: ${outputPath}`);
      }
    } catch (error: any) {
      console.error(`❌ Migration failed: ${error.message}`);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }

  private async migrateDirectory(options: MigrationOptions) {
    if (!options.dir) {
      console.error('❌ No directory specified');
      process.exit(1);
    }

    const dirPath = path.resolve(options.dir);

    if (!fs.existsSync(dirPath)) {
      console.error(`❌ Directory not found: ${dirPath}`);
      process.exit(1);
    }

    const files = fs
      .readdirSync(dirPath)
      .filter((f) => f.endsWith('.json') && !f.includes('.reflux.'));

    console.log(`📁 Found ${files.length} workflow file(s)\n`);

    let successful = 0;
    let failed = 0;

    for (const file of files) {
      const filePath = path.join(dirPath, file);

      try {
        const n8nWorkflowJson = fs.readFileSync(filePath, 'utf-8');
        const n8nWorkflow: N8nWorkflow = JSON.parse(n8nWorkflowJson);

        const result = transformN8nWorkflow(n8nWorkflow);

        if (result.success && result.workflow) {
          const outputPath = filePath.replace('.json', '.reflux.json');
          fs.writeFileSync(
            outputPath,
            JSON.stringify(result.workflow, null, 2),
            'utf-8'
          );

          console.log(`✅ ${file} → ${path.basename(outputPath)}`);
          successful++;

          if (options.verbose) {
            this.printResults(result, true);
          }
        } else {
          console.log(`❌ ${file} - Failed`);
          failed++;

          if (options.verbose) {
            result.errors.forEach((err) => console.log(`   ${err}`));
          }
        }
      } catch (error: any) {
        console.log(`❌ ${file} - ${error.message}`);
        failed++;
      }
    }

    console.log(`\n📊 Results: ${successful} successful, ${failed} failed`);
  }

  private printResults(result: any, verbose?: boolean) {
    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach((w: string) => console.log(`   - ${w}`));
    }

    if (result.unmappedNodes.length > 0) {
      console.log('\n🔧 Unmapped n8n nodes (need manual implementation):');
      result.unmappedNodes.forEach((n: string) => console.log(`   - ${n}`));
    }

    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach((e: string) => console.log(`   - ${e}`));
    }

    if (verbose && result.workflow) {
      console.log('\n📋 Workflow Summary:');
      console.log(`   Name: ${result.workflow.name}`);
      console.log(`   Steps: ${result.workflow.steps.length}`);
      console.log(
        `   Nodes: ${result.workflow.steps.map((s: any) => s.node).join(', ')}`
      );
    }
  }

  private showHelp() {
    console.log(`
REFLUX n8n Migration Tool

Usage:
  npx reflux-migrate <workflow.json>              Migrate single file
  npx reflux-migrate --dir <directory>            Migrate all workflows in directory
  npx reflux-migrate <workflow.json> -o out.json  Specify output file
  npx reflux-migrate --help                       Show this help

Options:
  -d, --dir <path>      Migrate all .json files in directory
  -o, --output <path>   Output file path (default: input.reflux.json)
  -v, --verbose         Show detailed migration logs
  -h, --help            Show this help

Examples:
  # Migrate single workflow
  npx reflux-migrate my-workflow.json

  # Migrate all workflows in folder
  npx reflux-migrate --dir ./n8n-workflows

  # With custom output
  npx reflux-migrate workflow.json -o reflux-workflow.json

Supported n8n Nodes:
  ✅ HTTP Request → nodes.http.request
  ✅ Webhook → nodes.webhook.trigger
  ✅ Code/Function → nodes.transform.execute
  ✅ If/Switch → nodes.condition.execute
  ✅ Database (Postgres/MySQL) → nodes.database.query
  ✅ Email Send → nodes.email.send
  ✅ OpenAI → nodes.openai.chat
  ⚠️  Custom nodes need manual implementation

Note: Credentials are NOT migrated. You need to reconfigure them in REFLUX.
`);
  }
}

// Run CLI
if (require.main === module) {
  const cli = new MigrationCLI();
  cli.run(process.argv.slice(2)).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { MigrationCLI };
