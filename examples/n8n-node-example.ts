// Example n8n node code to test converter
// Based on typical n8n node structure

import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';

export class SlackNotification implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Slack Notification',
    name: 'slackNotification',
    icon: 'file:slack.svg',
    group: ['output'],
    version: 1,
    description: 'Send notifications to Slack channels',
    defaults: {
      name: 'Slack Notification',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'slackApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Channel',
        name: 'channel',
        type: 'string',
        default: '',
        required: true,
        description: 'The channel to send the message to',
      },
      {
        displayName: 'Message',
        name: 'message',
        type: 'string',
        typeOptions: {
          alwaysOpenEditWindow: true,
        },
        default: '',
        required: true,
        description: 'The message to send',
      },
      {
        displayName: 'Username',
        name: 'username',
        type: 'string',
        default: 'n8n Bot',
        description: 'The username to display',
      },
      {
        displayName: 'Icon Emoji',
        name: 'iconEmoji',
        type: 'string',
        default: ':robot_face:',
        description: 'The emoji to use as icon',
      },
      {
        displayName: 'Attachments',
        name: 'attachments',
        type: 'json',
        default: '[]',
        description: 'Additional attachments in JSON format',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    // Get credentials
    const credentials = await this.getCredentials('slackApi');
    const token = credentials.token as string;

    for (let i = 0; i < items.length; i++) {
      try {
        // Get parameters
        const channel = this.getNodeParameter('channel', i) as string;
        const message = this.getNodeParameter('message', i) as string;
        const username = this.getNodeParameter('username', i, 'n8n Bot') as string;
        const iconEmoji = this.getNodeParameter('iconEmoji', i, ':robot_face:') as string;
        const attachments = this.getNodeParameter('attachments', i, '[]') as string;

        // Build request body
        const body = {
          channel,
          text: message,
          username,
          icon_emoji: iconEmoji,
          attachments: JSON.parse(attachments),
        };

        // Send request to Slack API
        const response = await this.helpers.request({
          method: 'POST',
          url: 'https://slack.com/api/chat.postMessage',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body,
          json: true,
        });

        // Check response
        if (!response.ok) {
          throw new Error(`Slack API error: ${response.error}`);
        }

        // Return the response data
        returnData.push({
          json: {
            success: true,
            channel: response.channel,
            timestamp: response.ts,
            message: response.message,
          },
        });

      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              error: error.message,
            },
          });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}
