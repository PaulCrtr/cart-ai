import { TavilySearchResults } from '@langchain/community/tools/tavily_search';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { RunnableConfig, RunnableLike } from '@langchain/core/runnables';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { ChatOpenAI } from '@langchain/openai';
import { AgentStateT } from 'src/app.service';

export function createResearcher(llm: ChatOpenAI): RunnableLike {
  const researcherAgent = createReactAgent({
    llm,
    tools: [new TavilySearchResults({ maxResults: 2 })],
    messageModifier: new SystemMessage(
      'You are a web researcher. You may use the Tavily search engine to search the web for' +
        ' important information, so the cart handler in your team can make useful action.',
    ),
  });

  const researcherNode = async (state: AgentStateT, config?: RunnableConfig) => {
    const result = await researcherAgent.invoke(state, config);
    const lastMessage = result.messages[result.messages.length - 1];
    return {
      messages: [new HumanMessage({ content: lastMessage.content, name: 'researcher' })],
    };
  };

  return researcherNode;
}
