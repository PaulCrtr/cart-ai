import { Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { START, StateGraph, CompiledStateGraph } from '@langchain/langgraph';
import { END, Annotation } from '@langchain/langgraph';
import { BaseMessage, HumanMessage } from '@langchain/core/messages';
import { ResearcherService } from '../agents/researcher/researcher.service';
import { CartHandlerService } from '../agents/cartHandler/cartHandler.service';
import { SupervisorService } from '../agents/supervisor/supervisor.service';

export type AgentStateT = {
  messages: BaseMessage[];
  next: string;
};

// Service for orchestrating a workflow between agents using a state graph
@Injectable()
export class WorkflowService {
  private llm = new ChatOpenAI({
    modelName: 'gpt-4-turbo',
    temperature: 0,
  });

  private agentState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
      reducer: (x, y) => x.concat(y),
      default: () => [],
    }),
    next: Annotation<string>({
      reducer: (x, y) => y ?? x ?? END,
      default: () => END,
    }),
  });

  private members = ['cart_handler', 'researcher'] as const;
  private graph: CompiledStateGraph<AgentStateT, any, any>;

  constructor(
    private cartHandlerService: CartHandlerService,
    private researcherService: ResearcherService,
    private supervisorService: SupervisorService,
  ) {
    this.createGraph();
  }

  async createGraph() {
    const workflow = new StateGraph(this.agentState)
      .addNode('researcher', this.researcherService.createNode(this.llm))
      .addNode('cart_handler', this.cartHandlerService.createNode(this.llm))
      .addNode('supervisor', await this.supervisorService.createChain(this.llm, this.members));

    this.members.forEach((member) => {
      workflow.addEdge(member, 'supervisor');
    });

    workflow.addConditionalEdges('supervisor', (x: AgentStateT) => x.next);
    workflow.addEdge(START, 'supervisor');

    this.graph = workflow.compile();
  }

  // Handles a user query by triggering the workflow process and returning the response.
  async processStream(query: string): Promise<string> {
    const streamResults = await this.graph.stream(
      {
        messages: [
          new HumanMessage({
            content: query,
          }),
        ],
      },
      { recursionLimit: 15 },
    );

    let finalResponse = '';

    const prettifyOutput = (output: Record<string, any>) => {
      const keys = Object.keys(output);
      const firstItem = output[keys[0]];
      console.dir(output);
      if ('messages' in firstItem && Array.isArray(firstItem.messages)) {
        const lastMessage = firstItem.messages[firstItem.messages.length - 1];
        finalResponse = lastMessage.content;
        console.dir(
          {
            lastMessage: lastMessage.content,
          },
          { depth: null },
        );
      }
    };

    for await (const output of streamResults) {
      if (!output?.__end__) {
        prettifyOutput(output);
        console.log('\x1b[34m============= \x1b[0m');
      }
    }

    return finalResponse;
  }
}
