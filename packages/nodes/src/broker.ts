/**
 * Moleculer broker for REFLUX nodes
 */

import { ServiceBroker } from 'moleculer';

export const broker = new ServiceBroker({
  nodeID: 'reflux-nodes',
  transporter: process.env.TRANSPORTER || 'redis://localhost:6379',

  // Service registry options
  registry: {
    strategy: 'RoundRobin',
    preferLocal: true,
  },

  // Logging
  logger: {
    type: 'Console',
    options: {
      level: 'info',
      colors: true,
      moduleColors: true,
    },
  },

  // Metrics
  metrics: {
    enabled: true,
    reporter: [
      {
        type: 'Console',
        options: {
          interval: 60,
        },
      },
    ],
  },

  // Request timeout
  requestTimeout: 30 * 1000, // 30 seconds
});
