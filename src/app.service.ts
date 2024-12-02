import { Injectable } from '@nestjs/common';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { START, StateGraph } from '@langchain/langgraph';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';
import { Runnable, RunnableConfig, RunnableLike } from '@langchain/core/runnables';
import { z } from 'zod';
import { JsonOutputToolsParser } from 'langchain/output_parsers';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import * as path from 'path';
import { END, Annotation } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';

@Injectable()
export class AppService {
  private agentState: any;
  private llm: ChatOpenAI;
  private graph: any;
  private researcherAgent: Runnable;
  private researcherNode: RunnableLike;
  private cartAgent: Runnable;
  private cartNode: RunnableLike;
  private supervisorChain: Runnable;
  private members = ['cart_handler', 'researcher'] as const;

  constructor() {
    this.llm = new ChatOpenAI({
      modelName: 'gpt-4o',
      temperature: 0,
    });
    this.createState();
    this.createResearcher();
    this.createCart();
    (async () => {
      await this.createSupervisor();
      this.createGraph();
    })();
  }

  createState() {
    this.agentState = Annotation.Root({
      messages: Annotation<BaseMessage[]>({
        reducer: (x, y) => x.concat(y),
        default: () => [],
      }),
      next: Annotation<string>({
        reducer: (x, y) => y ?? x ?? END,
        default: () => END,
      }),
    });
  }

  async createSupervisor() {
    const members = this.members;
    const options = [END, ...members];

    const systemPrompt = `You are the supervisor of a shopping cart tool. You oversee two workers:
       - 'cart_handler': manages the shopping cart (add, remove, or view items).
       - 'researcher': searches the web for relevant information.
       Your job is to:
       1. Route tasks to the appropriate worker based on the user's request.
       2. Once all tasks are complete, generate a clear and user-friendly response summarizing the outcome of the request.
       You must ensure your responses are concise, helpful, and address the user's needs.`;

    const routingTool = {
      name: 'route',
      description: 'Select the next role.',
      schema: z.object({
        next: z.enum([END, ...members]),
      }),
    };

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', systemPrompt],
      new MessagesPlaceholder('messages'),
      [
        'system',
        'Given the conversation above, who should act next?' + ' Or should we FINISH? Select one of: {options}',
      ],
    ]);

    const formattedPrompt = await prompt.partial({
      options: options.join(', '),
      // members: members.join(', '),
    });

    this.supervisorChain = formattedPrompt
      .pipe(
        this.llm.bindTools([routingTool], {
          tool_choice: 'route',
        }),
      )
      .pipe(new JsonOutputToolsParser())
      .pipe((x) => x[0].args);
  }

  createResearcher() {
    this.researcherAgent = createReactAgent({
      llm: this.llm,
      tools: [new TavilySearchResults({ maxResults: 2 })],
      messageModifier: new SystemMessage(
        'You are a web researcher. You may use the Tavily search engine to search the web for' +
          ' important information, so the cart handler in your team can make useful action.',
      ),
    });

    this.researcherNode = async (state: typeof this.agentState.State, config?: RunnableConfig) => {
      const result = await this.researcherAgent.invoke(state, config);
      const lastMessage = result.messages[result.messages.length - 1];
      return {
        messages: [new HumanMessage({ content: lastMessage.content, name: 'researcher' })],
      };
    };
  }

  createCart() {
    const loadCart = async () => {
      const filePath = path.resolve(__dirname, 'cart.json');
      if (!existsSync(filePath)) {
        return [];
      }
      const data = readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    };

    const saveCart = async (cart) => {
      const filePath = path.resolve(__dirname, 'cart.json');
      writeFileSync(filePath, JSON.stringify(cart, null, 2));
    };

    const readTool = new DynamicStructuredTool({
      name: 'read_tool',
      description: 'Displays the current cart.',
      schema: z.object({
        product: z
          .object({
            id: z.string().optional(),
            name: z.string().optional(),
            url: z.string().optional(),
          })
          .optional(),
      }),
      func: async () => {
        const cart = await loadCart();
        return JSON.stringify(cart);
      },
    });

    const addTool = new DynamicStructuredTool({
      name: 'add_tool',
      description: 'Adds a product to the cart.',
      schema: z.object({
        product: z.object({
          id: z.string(),
          name: z.string(),
          url: z.string().optional(),
        }),
      }),
      func: async ({ product }) => {
        const cart = await loadCart();
        cart.push(product);
        await saveCart(cart);
        return `Product added: ${product.name}`;
      },
    });

    const removeTool = new DynamicStructuredTool({
      name: 'remove_tool',
      description: 'Removes a product from the cart.',
      schema: z.object({
        product: z.object({
          id: z.string(),
        }),
      }),
      func: async ({ product }) => {
        const cart = await loadCart();
        const updatedCart = cart.filter((item) => item.id !== product.id);
        await saveCart(updatedCart);
        return `Product removed: ${product.id}`;
      },
    });

    const llm = this.llm;
    this.cartAgent = createReactAgent({
      llm,
      tools: [readTool, addTool, removeTool],
      messageModifier: new SystemMessage(
        `You are excellent at managing JSON files.
   - Always list the cart contents when unsure about what the user means.
   - For ambiguous deletion requests (e.g., "remove the tree"), first look for items with matching names or IDs.
   - Provide clear feedback if no items match or if multiple items are found.`,
      ),
    });

    this.cartNode = async (state: typeof this.agentState.State, config?: RunnableConfig) => {
      const result = await this.cartAgent.invoke(state, config);
      const lastMessage = result.messages[result.messages.length - 1];
      return {
        messages: [new HumanMessage({ content: lastMessage.content, name: 'cart_handler' })],
      };
    };
  }

  createGraph() {
    const members = this.members;
    const workflow = new StateGraph(this.agentState)
      .addNode('researcher', this.researcherNode)
      .addNode('cart_handler', this.cartNode)
      .addNode('supervisor', this.supervisorChain);

    members.forEach((member) => {
      workflow.addEdge(member, 'supervisor');
    });

    workflow.addConditionalEdges('supervisor', (x: typeof this.agentState.State) => x.next);

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
