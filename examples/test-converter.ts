/**
 * Test script for n8n → REFLUX node converter
 */
import * as fs from 'fs';
import * as path from 'path';
import { convertN8nNode } from '../packages/core/src/migration/node-converter';

async function main() {
  console.log('🔄 Testing n8n Node Converter\n');

  // Read example n8n node
  const nodeName = process.argv[2] || 'slack';
  let examplePath: string;
  let nodeLabel: string;

  if (nodeName === 'openai') {
    examplePath = path.join(__dirname, 'n8n-openai-node.ts');
    nodeLabel = 'OpenAI Chat';
  } else {
    examplePath = path.join(__dirname, 'n8n-node-example.ts');
    nodeLabel = 'SlackNotification';
  }

  const n8nCode = fs.readFileSync(examplePath, 'utf-8');

  console.log(`📖 Input: n8n ${nodeLabel} node`);
  console.log(`   Size: ${n8nCode.length} characters\n`);

  // Convert
  console.log('⚙️  Converting...\n');
  const result = convertN8nNode(n8nCode);

  // Display results
  if (result.success) {
    console.log('✅ Conversion successful!\n');
    console.log(`📝 Generated REFLUX service: ${result.nodeName}\n`);

    if (result.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      result.warnings.forEach(w => console.log(`   - ${w}`));
      console.log();
    }

    // Save output
    const outputPath = path.join(__dirname, 'converted-node.ts');
    fs.writeFileSync(outputPath, result.code!);
    console.log(`💾 Saved to: ${outputPath}\n`);

    // Display generated code
    console.log('📄 Generated Code:');
    console.log('─'.repeat(80));
    console.log(result.code);
    console.log('─'.repeat(80));
  } else {
    console.log('❌ Conversion failed!\n');
    console.log('Errors:');
    result.errors.forEach(e => console.log(`   - ${e}`));
  }
}

main().catch(console.error);
