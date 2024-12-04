import { JsonOutputToolsParser } from 'langchain/output_parsers';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { END } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { Runnable } from '@langchain/core/runnables';

@Injectable()
export class SupervisorService {
  async createChain(llm: ChatOpenAI, members: readonly string[]): Promise<Runnable> {
    const options = [END, ...members];

    const systemPrompt =
      `You are the supervisor of a shopping cart tool. You oversee two workers: ` +
      `- 'cart_handler': manages the shopping cart (add, remove, or view items). ` +
      `- 'researcher': searches for products on the Internet. ` +
      `Your job is to route tasks to the appropriate worker.`;

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
    });

    const chain = formattedPrompt
      .pipe(
        llm.bindTools([routingTool], {
          tool_choice: 'route',
        }),
      )
      .pipe(new JsonOutputToolsParser())
      .pipe((x) => x[0].args);

    return chain;
  }
}
