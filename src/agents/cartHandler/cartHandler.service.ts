import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { RunnableConfig, RunnableLike } from '@langchain/core/runnables';
import { ChatOpenAI } from '@langchain/openai';
import cartHandlerTools from './cartHandler.tools';
import { AgentStateT } from 'src/workflow/workflow.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CartHandlerService {
  createNode(llm: ChatOpenAI): RunnableLike {
    const agent = createReactAgent({
      llm,
      tools: cartHandlerTools,
      messageModifier: new SystemMessage(
        `You manage a shopping cart in JSON format with three tools: add, remove, and read (use it only if the only request is to display the cart, otherwise tools will return the list). ` +
          `Products to add are provided by a researcher agent and must include a name and URL. Do not infer or create substitutes. ` +
          `If you receive several products, choose the one that most closely resembles a sales item. ` +
          `For ambiguous deletion requests (e.g., "remove the tree"), first look for items with matching names, IDs, URLs. ` +
          `Always provide the product name and url after adding it. `,
      ),
    });

    const node = async (state: AgentStateT, config?: RunnableConfig) => {
      const result = await agent.invoke(state, config);
      const lastMessage = result.messages[result.messages.length - 1];
      return {
        messages: [new HumanMessage({ content: lastMessage.content, name: 'cart_handler' })],
      };
    };

    return node;
  }
}
