import { TavilySearchResults } from '@langchain/community/tools/tavily_search';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { RunnableConfig, RunnableLike } from '@langchain/core/runnables';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { ChatOpenAI } from '@langchain/openai';
import { Injectable } from '@nestjs/common';
import { AgentStateT } from 'src/workflow/workflow.service';

@Injectable()
export class ResearcherService {
  // Return an agent node with the Tavily tool and instructions for performing web searches
  createNode(llm: ChatOpenAI): RunnableLike {
    const agent = createReactAgent({
      llm,
      tools: [new TavilySearchResults({ maxResults: 5 })],
      messageModifier: new SystemMessage(
        `You're a web researcher. You may use the Tavily search engine to search the web for a product. ` +
          `Make sure to search for a product (not comparison sites, wikipedia, or anything else). ` +
          `If you don't have a lot of information about a product, do the search anyway. ` +
          `Prioritize and execute the add or search request if the query contains multiple requests.` +
          `Don't worry about adding the product to the cart; another agent is responsible for saving the information you return.`,
      ),
    });

    const node = async (state: AgentStateT, config?: RunnableConfig) => {
      const result = await agent.invoke(state, config);
      const lastMessage = result.messages[result.messages.length - 1];
      return {
        // Wrap the last message into a HumanMessage for the researcher
        messages: [new HumanMessage({ content: lastMessage.content, name: 'researcher' })],
      };
    };

    return node;
  }
}
