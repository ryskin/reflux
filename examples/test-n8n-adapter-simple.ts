/**
 * Simple test of n8n adapter without real n8n packages
 * Creates a mock n8n node to demonstrate the adapter
 */
import { ServiceBroker } from 'moleculer';
import { createN8nNodeService, INodeType, INodeTypeDescription, IExecuteFunctions, INodeExecutionData } from '../packages/core/src/adapters/n8n-node-adapter';

// Create a simple mock n8n node for testing
class MockWeatherNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Weather API',
    name: 'weatherApi',
    group: ['transform'],
    version: 1,
    description: 'Fetch weather data',
    defaults: {
      name: 'Weather API',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'City',
        name: 'city',
        type: 'string',
        default: 'San Francisco',
        required: true,
        description: 'City name',
      },
      {
        displayName: 'Units',
        name: 'units',
        type: 'options',
        options: [
          { name: 'Celsius', value: 'metric' },
          { name: 'Fahrenheit', value: 'imperial' },
        ],
        default: 'metric',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const city = this.getNodeParameter('city', 0) as string;
    const units = this.getNodeParameter('units', 0, 'metric') as string;

    console.log(`[MockWeatherNode] Fetching weather for ${city} (${units})`);

    // Simulate API call
    const temperature = Math.floor(Math.random() * 30) + 10;
    const weatherData = {
      city,
      temperature,
      units: units === 'metric' ? '°C' : '°F',
      condition: 'Sunny',
      timestamp: new Date().toISOString(),
    };

    // Return n8n format
    return [[{ json: weatherData }]];
  }
}

async function testAdapter() {
  console.log('🧪 Testing n8n Adapter\n');

  // Create broker
  const broker = new ServiceBroker({
    nodeID: 'test-adapter',
    logger: {
      type: 'Console',
      options: {
        level: 'info',
      },
    },
  });

  // Create mock n8n node
  const mockNode = new MockWeatherNode();

  // Wrap with adapter
  const WeatherService = createN8nNodeService(mockNode);

  // Register service
  broker.createService(WeatherService);

  await broker.start();

  console.log('✅ Service registered: 1.0.0.nodes.n8n.weatherApi\n');

  // Test 1: Basic call
  console.log('Test 1: Basic call with defaults');
  const result1: any = await broker.call('1.0.0.nodes.n8n.weatherApi.execute', {
    city: 'London',
  });
  console.log('Result:', result1.items[0].json);
  console.log();

  // Test 2: With options
  console.log('Test 2: With custom options');
  const result2: any = await broker.call('1.0.0.nodes.n8n.weatherApi.execute', {
    city: 'Tokyo',
    units: 'imperial',
  });
  console.log('Result:', result2.items[0].json);
  console.log();

  // Test 3: Get node description
  console.log('Test 3: Get node description');
  const description: any = await broker.call('1.0.0.nodes.n8n.weatherApi.getDescription');
  console.log('Node:', description.displayName);
  console.log('Properties:', description.properties.map((p: any) => p.name));
  console.log();

  await broker.stop();

  console.log('✅ All tests passed!');
}

testAdapter().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
