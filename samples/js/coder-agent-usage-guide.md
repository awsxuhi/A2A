# Coder Agent 使用指南

本指南将帮助您与 Coder Agent 交互，提交任务并获取生成的代码。

> **重要说明**：Coder Agent 生成的代码不会自动保存到文件系统中，而是作为响应返回给客户端。您需要手动将这些代码保存到文件中，或使用我们提供的辅助脚本。

## 前提条件

- 已经运行了 Coder Agent 服务：`npm run agents:coder-claude`
- 服务正在监听 http://localhost:41241

## 使用方法

### 方法 1：使用 curl 命令行工具

您可以使用 curl 命令向 Coder Agent 发送请求。以下是一个基本示例：

```bash
curl -X POST http://localhost:41241 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tasks/send",
    "id": "task-1",
    "params": {
      "id": "unique-task-id-123",
      "message": {
        "role": "user",
        "parts": [
          {
            "type": "text",
            "text": "请创建一个简单的 React 计数器组件"
          }
        ]
      }
    }
  }'
```

### 方法 2：使用 A2A CLI 工具

项目中包含了一个 CLI 工具，可以更方便地与 Coder Agent 交互：

```bash
# 使用 A2A CLI 工具发送请求
npm run a2a:cli -- send --url http://localhost:41241 --message "请创建一个简单的 React 计数器组件"
```

### 方法 3：使用流式响应（推荐）

如果您想实时查看代码生成过程，可以使用流式 API：

```bash
curl -N -X POST http://localhost:41241 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tasks/sendSubscribe",
    "id": "task-1",
    "params": {
      "id": "unique-task-id-123",
      "message": {
        "role": "user",
        "parts": [
          {
            "type": "text",
            "text": "请创建一个简单的 React 计数器组件"
          }
        ]
      }
    }
  }'
```

或使用 CLI 工具：

```bash
npm run a2a:cli -- subscribe --url http://localhost:41241 --message "请创建一个简单的 React 计数器组件"
```

## 响应格式

Coder Agent 会返回 JSON-RPC 格式的响应，包含生成的代码文件。例如：

```json
{
  "jsonrpc": "2.0",
  "id": "task-1",
  "result": {
    "id": "unique-task-id-123",
    "status": {
      "state": "completed",
      "timestamp": "2025-04-28T14:30:00.000Z",
      "message": {
        "role": "agent",
        "parts": [
          {
            "type": "text",
            "text": "Generated files: Counter.jsx, App.jsx"
          }
        ]
      }
    },
    "artifacts": [
      {
        "name": "src/components/Counter.jsx",
        "parts": [
          {
            "type": "text",
            "text": "// Counter.jsx 文件内容..."
          }
        ],
        "lastChunk": true
      },
      {
        "name": "src/App.jsx",
        "parts": [
          {
            "type": "text",
            "text": "// App.jsx 文件内容..."
          }
        ],
        "lastChunk": true
      },
      {
        "name": "src/App.css",
        "parts": [
          {
            "type": "text",
            "text": "/* App.css 文件内容... */"
          }
        ],
        "lastChunk": true
      }
    ]
  }
}
```

## 示例任务

以下是一些您可以尝试的示例任务：

1. 创建一个简单的 React 计数器组件
2. 编写一个 Python 函数来计算斐波那契数列
3. 创建一个带有表单验证的 HTML 登录页面
4. 编写一个 Node.js Express 服务器，提供简单的 REST API
5. 创建一个使用 CSS Grid 的响应式布局

## 故障排除

如果遇到问题，请检查：

1. Coder Agent 服务是否正在运行（终端中应该显示 "Server started on http://localhost:41241"）
2. 请求格式是否正确（JSON-RPC 2.0 格式）
3. 任务 ID 是否唯一（每个新任务应该使用不同的 ID）
4. 网络连接是否正常（可以使用 `curl http://localhost:41241` 测试连接）

## 保存生成的代码

### 方法 1：使用辅助脚本（强烈推荐）

我们提供了一个辅助脚本，可以自动将生成的代码保存到文件系统中：

```bash
# 安装依赖
npm install

# 运行辅助脚本
npm run save-code
```

这个脚本会：
1. 提示您输入代码生成请求
2. 发送请求到 Coder Agent
3. 将生成的所有代码文件保存到 `generated-code/[timestamp]/` 目录中，保持原始的目录结构
4. 显示生成的文件列表

**优点**：
- 自动保存所有生成的文件，不仅仅是第一个
- 保持原始的目录结构（如 `src/components/Counter.jsx`）
- 不依赖外部工具（如 jq）
- 简单易用，只需一个命令

### 方法 2：手动保存

当您收到包含代码的响应后，可以将代码保存到文件中：

#### 方法 2.1：使用临时文件

```bash
# 1. 将响应保存到临时文件
curl -s -X POST http://localhost:41241 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tasks/send",
    "id": "task-1",
    "params": {
      "id": "unique-task-id-123",
      "message": {
        "role": "user",
        "parts": [
          {
            "type": "text",
            "text": "请创建一个简单的 React 计数器组件"
          }
        ]
      }
    }
  }' > response.json

# 2. 查看响应中的文件列表
cat response.json

# 3. 手动从响应中复制代码并保存到文件中
```

#### 方法 2.2：使用 jq 工具（需要安装）

如果您收到 `command not found: jq` 错误，需要先安装 jq 工具：

```bash
# 在 Ubuntu/Debian 上安装 jq
sudo apt-get install jq

# 在 macOS 上安装 jq
brew install jq

# 在 Windows 上安装 jq (使用 Chocolatey)
choco install jq
```

安装后，可以使用以下命令提取和保存代码：

```bash
# 使用 jq 工具提取第一个文件的内容并保存
curl -s -X POST http://localhost:41241 -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"tasks/send","id":"task-1","params":{"id":"unique-task-id-123","message":{"role":"user","parts":[{"type":"text","text":"请创建一个简单的 React 计数器组件"}]}}}' | jq -r '.result.artifacts[0].parts[0].text' > Counter.jsx
```

> **注意**：上面的命令只会保存第一个生成的文件（`.result.artifacts[0]`）。如果 Coder Agent 生成了多个文件（如 `src/components/Counter.jsx`、`src/App.jsx`、`src/App.css` 等），您需要为每个文件运行类似的命令，修改索引号和输出文件名：
> 
> ```bash
> # 保存第二个文件
> ... | jq -r '.result.artifacts[1].parts[0].text' > App.jsx
> 
> # 保存第三个文件
> ... | jq -r '.result.artifacts[2].parts[0].text' > App.css
> ```
> 
> 此外，这种方法不会保持原始的目录结构。例如，如果文件名是 `src/components/Counter.jsx`，它会被保存为 `Counter.jsx`。
> 
> 因此，我们强烈推荐使用辅助脚本（`npm run save-code`），它可以自动保存所有生成的文件，并保持原始的目录结构。

### 为什么代码不会自动保存？

Coder Agent 遵循 A2A（Agent-to-Agent）协议，它的设计理念是作为一个服务，通过 API 提供代码生成功能，而不是直接操作文件系统。这种设计有几个优点：

1. **安全性**：避免未经授权的文件系统操作
2. **灵活性**：客户端可以决定如何处理生成的代码（保存、修改、丢弃等）
3. **集成性**：可以轻松集成到其他工具和工作流中
4. **无状态**：服务保持无状态，更容易扩展和维护
