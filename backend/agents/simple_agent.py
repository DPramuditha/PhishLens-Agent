import os

from dotenv import load_dotenv
from langchain.agents import create_agent
from langchain_openai import AzureChatOpenAI


def build_agent():
    llm = AzureChatOpenAI(
        azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
        api_key=os.environ["AZURE_OPENAI_API_KEY"],
        api_version=os.environ.get("AZURE_OPENAI_API_VERSION", "2024-02-01"),
        azure_deployment=os.environ["AZURE_OPENAI_DEPLOYMENT"],
        temperature=0.2,
    )

    return create_agent(
        model=llm,
        tools=[],
        system_prompt="You are a helpful assistant.",
        debug=True,
    )


def main() -> None:
    load_dotenv()
    agent = build_agent()
    while True:
        user_input = input("You: ").strip()
        if user_input.lower() in {"exit", "quit"}:
            break
        result = agent.invoke({"messages": [{"role": "user", "content": user_input}]})
        final_message = result["messages"][-1]
        print(f"Assistant: {final_message.content}")


if __name__ == "__main__":
    main()
