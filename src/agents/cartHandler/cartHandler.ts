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
      `You are excellent at managing JSON files.
   - Always list the cart contents when unsure about what the user means.
   - For ambiguous deletion requests (e.g., "remove the tree"), first look for items with matching names or IDs.
   - Provide clear feedback if no items match or if multiple items are found.`,
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
