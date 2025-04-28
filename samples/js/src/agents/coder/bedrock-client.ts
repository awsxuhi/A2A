import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

// 创建 Bedrock 客户端，使用 default profile
// AWS SDK 会自动从 ~/.aws/credentials 加载凭证
const bedrockClient = new BedrockRuntimeClient({});

// Claude 3.7 Sonnet 模型 ID
const MODEL_ID = "us.anthropic.claude-3-7-sonnet-20250219-v1:0";

/**
 * 使用 Claude 模型生成代码
 * @param systemPrompt 系统提示
 * @param messages 消息历史
 * @returns 生成的代码
 */
export async function generateCode(systemPrompt: string, messages: any[]) {
  // 构建 Claude 请求体
  const requestBody = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 4096,
    temperature: 0.7,
    system: systemPrompt,
    messages: messages.map(msg => ({
      role: msg.role === "model" ? "assistant" : "user",
      content: msg.content.map((c: any) => ({ type: "text", text: c.text }))
    }))
  };

  // 创建请求命令
  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    body: JSON.stringify(requestBody),
    contentType: "application/json",
  });

  try {
    // 发送请求
    const response = await bedrockClient.send(command);
    
    // 解析响应
    const responseBody = JSON.parse(
      new TextDecoder().decode(response.body)
    );
    
    return responseBody.content[0].text;
  } catch (error) {
    console.error("Error calling Claude model:", error);
    throw error;
  }
}
