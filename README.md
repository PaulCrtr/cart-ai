# 🛒 Cart AI

An AI-powered shopping cart manager built with LangGraphJs, OpenAI, Tavily, and Nest.js.

### Installation

```bash
  npm install
  cp .env.example .env
```
-> Set the API keys for OpenAI, Tavily and Langgsmith in the `.env` file
    
### Start the application

```bash
  npm run start
```
-> You can start using the application on `localhost:3000/invoke?query=`

## Approach and Issues

I followed the [Agent Supervisor](https://langchain-ai.github.io/langgraphjs/tutorials/multi_agent/agent_supervisor/) example from the LangGraphJs documentation to set up the collaboration between agents.  
I also tried other architectures where the coordinator synthesized a final response for the user and where the cart handler and the researcher communicated directly, but I was unable to maintain the coordinator routing efficiency in those solutions.

I encountered issues with bugs caused by complex or unclear user requests and think the workflow could still be optimized by reducing agent calls to save time, or by improving the order of the calls.