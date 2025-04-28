import { TaskYieldUpdate } from "../../server/handler.js";
import {
  TaskContext,
  A2AServer
} from "../../server/index.js"; // Import server components
import * as schema from "../../schema.js"; // Import schema for types
import { generateCode } from "./bedrock-client.js";

// 注意：AWS SDK 会自动从 ~/.aws/credentials 加载凭证
console.log("[CoderAgent] Using AWS credentials from default profile");

// 提取代码块的正则表达式
const codeBlockRegex = /```(\w+)?\s+([^\n]+)?\n([\s\S]*?)```/g;

/**
 * 从文本中提取代码块
 * @param text 包含代码块的文本
 * @returns 提取的文件数组
 */
function extractCodeFiles(text: string): { filename: string, content: string }[] {
  const files: { filename: string, content: string }[] = [];
  let match;
  
  while ((match = codeBlockRegex.exec(text)) !== null) {
    const language = match[1] || "";
    const filename = match[2] || `file.${language || "txt"}`;
    const content = match[3] || "";
    
    files.push({ filename, content });
  }
  
  return files;
}

async function* coderAgent({
  task,
  history, // Extract history from context
}: TaskContext): AsyncGenerator<TaskYieldUpdate, schema.Task | void, unknown> {
  // 将 A2A 历史记录转换为 Claude 消息格式
  const messages = (history ?? [])
    .map((m) => ({
      role: (m.role === "agent" ? "model" : "user"),
      content: m.parts
        .filter((p): p is schema.TextPart => !!(p as schema.TextPart).text)
        .map((p) => ({ text: p.text })),
    }))
    .filter((m) => m.content.length > 0);

  if (messages.length === 0) {
    console.warn(`[CoderAgent] No history/messages found for task ${task.id}`);
    yield {
      state: "failed",
      message: {
        role: "agent",
        parts: [{ type: "text", text: "No input message found." }],
      },
    };
    return;
  }

  yield {
    state: "working",
    message: {
      role: "agent",
      parts: [{ type: "text", text: "Generating code..." }],
    },
  };

  // 系统提示
  const systemPrompt = `You are an expert coding assistant. Provide high-quality code samples according to the user's request.

When generating code:
1. Always include the filename on the same line as the opening code ticks.
2. Always include both language and path.
3. Use the following format for code blocks:
\`\`\`language filename.ext
// code goes here
\`\`\`
4. If you need to output multiple files, make sure each is in its own code block separated by explanations.
5. Always include a brief comment at the top of each file explaining its purpose.
6. If you aren't working with a specific directory structure, use descriptive filenames.`;

  try {
    // 调用 Claude 模型生成代码
    const generatedText = await generateCode(systemPrompt, messages);
    
    // 从生成的文本中提取代码文件
    const files = extractCodeFiles(generatedText);
    
    // 如果没有提取到文件，返回原始文本
    if (files.length === 0) {
      yield {
        state: "completed",
        message: {
          role: "agent",
          parts: [{ type: "text", text: generatedText }],
        },
      };
      return;
    }
    
    // 发送每个提取的文件
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`[CoderAgent] Emitting file (index ${i}): ${file.filename}`);
      yield {
        index: i,
        name: file.filename,
        parts: [{ type: "text", text: file.content }],
        lastChunk: true,
      };
    }
    
    // 发送完成状态
    yield {
      state: "completed",
      message: {
        role: "agent",
        parts: [
          {
            type: "text",
            text: files.length > 0
              ? `Generated files: ${files.map(f => f.filename).join(", ")}`
              : "Completed, but no files were generated.",
          },
        ],
      },
    };
  } catch (error) {
    console.error("[CoderAgent] Error generating code:", error);
    yield {
      state: "failed",
      message: {
        role: "agent",
        parts: [{ type: "text", text: `Error generating code: ${error}` }],
      },
    };
  }
}

// --- Server Setup ---

const coderAgentCard: schema.AgentCard = {
  name: "Coder Agent (Claude)",
  description:
    "An agent that generates code based on natural language instructions using AWS Bedrock Claude 3.7 Sonnet model.",
  url: "http://localhost:41241", // Default port used in the script
  provider: {
    organization: "A2A Samples",
  },
  version: "0.0.1",
  capabilities: {
    streaming: true,
    pushNotifications: false,
    stateTransitionHistory: true,
  },
  authentication: null,
  defaultInputModes: ["text"],
  defaultOutputModes: ["text", "file"],
  skills: [
    {
      id: "code_generation",
      name: "Code Generation",
      description:
        "Generates code snippets or complete files based on user requests.",
      tags: ["code", "development", "programming"],
      examples: [
        "Write a python function to calculate fibonacci numbers.",
        "Create an HTML file with a basic button that alerts 'Hello!' when clicked.",
        "Generate a TypeScript class for a user profile with name and email properties.",
        "Refactor this Java code to be more efficient.",
        "Write unit tests for the following Go function.",
      ],
    },
  ],
};

const server = new A2AServer(coderAgent, {
  card: coderAgentCard,
});

server.start(); // Default port 41241

console.log("[CoderAgent] Server started on http://localhost:41241");
console.log("[CoderAgent] Press Ctrl+C to stop the server");
