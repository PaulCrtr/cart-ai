import { Injectable } from '@nestjs/common';
import { HumanMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { START, StateGraph } from '@langchain/langgraph';
import { END, Annotation } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';
import { createResearcher } from './agents/researcher';
import { createCartHandler } from './agents/cartHandler';
import { createSupervisor } from './agents/supervisor';

export type AgentStateT = {
  messages: BaseMessage[];
  next: string;
};

@Injectable()
export class AppService {
  private llm = new ChatOpenAI({
    modelName: 'gpt-4o',
    temperature: 0,
  });
  private graph: any;

  constructor() {
    this.createGraph();
  }

  async createGraph() {
    const agentState = Annotation.Root({
      messages: Annotation<BaseMessage[]>({
        reducer: (x, y) => x.concat(y),
        default: () => [],
      }),
      next: Annotation<string>({
        reducer: (x, y) => y ?? x ?? END,
        default: () => END,
      }),
    });

    const members = ['cart_handler', 'researcher'] as const;

    const workflow = new StateGraph(agentState)
      .addNode('researcher', createResearcher(this.llm))
      .addNode('cart_handler', createCartHandler(this.llm))
      .addNode('supervisor', await createSupervisor(this.llm, members));

    members.forEach((member) => {
      workflow.addEdge(member, 'supervisor');
    });

    workflow.addConditionalEdges('supervisor', (x: AgentStateT) => x.next);
    workflow.addEdge(START, 'supervisor');
    this.graph = workflow.compile();
  }

  async invoke(query: string): Promise<string> {
    const streamResults = await this.graph.stream(
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
