# 从 Gemini 迁移到 AWS Bedrock Claude 模型指南

本指南将帮助您将 Coder Agent 从使用 Google Gemini 模型迁移到 AWS Bedrock 上的 Anthropic Claude 3.7 Sonnet 模型。

> **注意**：我们最初尝试使用 Genkit 与 AWS Bedrock 集成，但发现 Genkit 目前没有官方的 AWS Bedrock 插件。因此，我们采用了直接使用 AWS SDK 的方法，这提供了更多的控制和灵活性。

## 迁移步骤

### 1. 安装 AWS SDK Bedrock 客户端

首先，您需要安装 AWS SDK Bedrock 客户端：

```bash
npm install @aws-sdk/client-bedrock-runtime
```

### 2. 配置 AWS 凭证

代码使用 AWS SDK 的默认凭证提供链，会自动从 `~/.aws/credentials` 文件中加载凭证。确保您已经配置了 AWS CLI：

```bash
# 如果您还没有配置 AWS CLI，可以运行
aws configure

# 这将提示您输入 Access Key ID、Secret Access Key 和默认区域
```

确保您的 AWS 账户已启用 Bedrock 服务，并且有权限访问 Claude 3.7 Sonnet 模型。您可以在 AWS Bedrock 控制台中检查模型访问权限。

### 3. 使用新的实现文件

我们创建了两个新文件来替换原有的 Gemini 实现：

- `src/agents/coder/bedrock-client.ts` - 直接使用 AWS SDK 与 Bedrock 交互的客户端
- `src/agents/coder/index-claude.ts` - 更新后的入口文件，使用 Claude 模型

这些文件完全独立于原始的 Gemini 实现，您可以同时保留两个版本，根据需要选择使用哪个。

### 4. 更新 package.json

在 `package.json` 文件中添加一个新的脚本来运行 Claude 版本的 Coder Agent：

```json
"scripts": {
  "agents:coder-claude": "npx tsx src/agents/coder/index-claude.ts"
}
```

### 5. 运行 Claude 版本的 Coder Agent

设置好环境变量后，运行以下命令启动使用 Claude 模型的 Coder Agent：

```bash
npm run agents:coder-claude
```

## 代码变更详情

### 1. bedrock-client.ts

```typescript
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

// 创建 Bedrock 客户端，使用 default profile
// AWS SDK 会自动从 ~/.aws/credentials 加载凭证
const bedrockClient = new BedrockRuntimeClient({});

// Claude 3.7 Sonnet 模型 ID
const MODEL_ID = "anthropic.claude-3-7-sonnet-20250219-v1:0";

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
```

主要变更：
- 直接使用 AWS SDK 与 Bedrock 交互，而不是通过 Genkit
- 创建了一个简单的函数来调用 Claude 模型生成代码

### 2. index-claude.ts

主要变更：
- 导入 `bedrock-client.js` 而不是 `genkit.js`
- 使用 AWS 默认凭证而不是检查环境变量
- 实现了代码块提取函数，从 Claude 响应中提取代码文件
- 更新 AgentCard 名称和描述以反映使用 Claude 模型

## 注意事项

1. **直接 API 调用**：我们直接使用 AWS SDK 调用 Bedrock API，而不是通过 Genkit，这提供了更多的控制和灵活性。

2. **模型行为差异**：Claude 和 Gemini 可能在代码生成方面有细微差异，可能需要调整系统提示或其他参数以获得最佳结果。

3. **成本考虑**：AWS Bedrock 上的 Claude 模型和 Google Gemini 的定价不同，请考虑成本影响。

4. **错误处理**：如果遇到与 AWS 凭证或模型访问相关的错误，请检查您的 AWS 配置和权限。

5. **代码提取**：新实现包含一个正则表达式来从 Claude 响应中提取代码块，这可能需要根据实际输出格式进行调整。

## 故障排除

如果遇到问题，请检查：

1. AWS 凭证是否正确配置（`~/.aws/credentials`）
2. AWS 账户是否有权限访问 Claude 3.7 Sonnet 模型
3. 是否已安装 `@aws-sdk/client-bedrock-runtime` 包
4. 网络连接是否正常，可以访问 AWS Bedrock 服务
5. 代码提取正则表达式是否与 Claude 输出格式匹配
6. 可以使用 `aws bedrock list-foundation-models` 命令验证您是否有权限访问 Bedrock 服务
