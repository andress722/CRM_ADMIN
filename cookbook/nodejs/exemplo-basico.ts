// Exemplo básico de uso do Copilot SDK Node.js
import { CopilotClient, defineTool } from "@github/copilot-sdk";
import { z } from "zod";

async function main() {
  const client = new CopilotClient({ logLevel: "info" });
  await client.start();

  const session = await client.createSession({
    model: "gpt-4",
    tools: [
      defineTool("echo", {
        description: "Repete o texto recebido",
        parameters: z.object({ text: z.string() }),
        handler: async (args) => args.text,
      }),
    ],
  });

  session.on((event) => {
    if (event.type === "assistant.message") {
      console.log("Resposta:", event.data.content);
    }
    if (event.type === "session.idle") {
      client.stop();
    }
  });

  await session.send({ prompt: "Use a ferramenta echo para repetir: Olá Copilot!" });
}

main();
