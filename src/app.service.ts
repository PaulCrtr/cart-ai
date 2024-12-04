import { Injectable } from '@nestjs/common';
import { HumanMessage } from '@langchain/core/messages';
import { WorkflowService } from './workflow/workflow.service';

@Injectable()
export class AppService {
  constructor(private workflowService: WorkflowService) {}

  async invoke(query: string): Promise<string> {
    const streamResults = await this.workflowService.graph.stream(
      {
        messages: [
          new HumanMessage({
            content: query,
          }),
        ],
      },
      { recursionLimit: 20 },
    );

    let lastMessageContent = '';

    const prettifyOutput = (output: Record<string, any>) => {
      const keys = Object.keys(output);
      const firstItem = output[keys[0]];

      if ('messages' in firstItem && Array.isArray(firstItem.messages)) {
        const lastMessage = firstItem.messages[firstItem.messages.length - 1];
        lastMessageContent = lastMessage.content;

        console.dir(
          {
            type: lastMessage._getType(),
            content: lastMessage.content,
            tool_calls: lastMessage.tool_calls,
          },
          { depth: null },
        );
      }

      if ('sender' in firstItem) {
        console.log({
          sender: firstItem.sender,
        });
      }
    };

    for await (const output of streamResults) {
      if (!output?.__end__) {
        prettifyOutput(output);
        console.log('----');
      }
    }

    return lastMessageContent;
  }
}
