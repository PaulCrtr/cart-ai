import { z } from 'zod';
import { JsonOutputToolsParser } from 'langchain/output_parsers';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { END } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';

export async function createSupervisor(llm: ChatOpenAI, members) {
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
    ['system', 'Given the conversation above, who should act next?' + ' Or should we FINISH? Select one of: {options}'],
  ]);

  const formattedPrompt = await prompt.partial({
    options: options.join(', '),
    // members: members.join(', '),
  });

  const supervisorChain = formattedPrompt
    .pipe(
      llm.bindTools([routingTool], {
        tool_choice: 'route',
      }),
    )
    .pipe(new JsonOutputToolsParser())
    .pipe((x) => x[0].args);

  return supervisorChain;
}
