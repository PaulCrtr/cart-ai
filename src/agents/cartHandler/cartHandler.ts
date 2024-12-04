import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { RunnableConfig } from '@langchain/core/runnables';
import { ChatOpenAI } from '@langchain/openai';
import { AgentStateT } from 'src/app.service';
import cartHandlerTools from './tools';

export function createCartHandler(llm: ChatOpenAI) {
  const cartHandlerAgent = createReactAgent({
    llm,
    tools: cartHandlerTools,
    messageModifier: new SystemMessage(
      `You manage a shopping cart in JSON format. You can add or remove products and read the list. ` +
        `Products to be added come from a researcher agent, never create substitute items. ` +
        `Never add more than one item at a time. If you receive several, choose one to add. ` +
        `For ambiguous deletion requests (e.g., "remove the tree"), first look for items with matching names, IDs, URLs. ` +
        `Always provide the product name and url after adding it. Give unique IDs to products.`,
    ),
  });

  const cartHandlerNode = async (state: AgentStateT, config?: RunnableConfig) => {
    const result = await cartHandlerAgent.invoke(state, config);
    const lastMessage = result.messages[result.messages.length - 1];
    return {
      messages: [new HumanMessage({ content: lastMessage.content, name: 'cart_handler' })],
    };
  };

  return cartHandlerNode;
}
