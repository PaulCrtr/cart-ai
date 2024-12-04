import { Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { START, StateGraph } from '@langchain/langgraph';
import { END, Annotation } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';
import { ResearcherService } from '../agents/researcher/researcher.service';
import { CartHandlerService } from '../agents/cartHandler/cartHandler.service';
import { createSupervisor } from '.././agents/supervisor';

export type AgentStateT = {
  messages: BaseMessage[];
  next: string;
};

@Injectable()
export class WorkflowService {
  private llm = new ChatOpenAI({
    modelName: 'gpt-4o',
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
  public graph: any;

  constructor(
    private cartHandlerService: CartHandlerService,
    private researcherService: ResearcherService,
  ) {
    this.createGraph();
  }

  async createGraph() {
    const workflow = new StateGraph(this.agentState)
      .addNode('researcher', this.researcherService.createNode(this.llm))
      .addNode('cart_handler', this.cartHandlerService.createNode(this.llm))
      .addNode('supervisor', await createSupervisor(this.llm, this.members));

    this.members.forEach((member) => {
      workflow.addEdge(member, 'supervisor');
    });

    workflow.addConditionalEdges('supervisor', (x: AgentStateT) => x.next);
    workflow.addEdge(START, 'supervisor');

    this.graph = workflow.compile();
  }
}
