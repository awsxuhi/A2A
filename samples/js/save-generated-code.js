#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import readline from 'readline';

// 获取当前目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 创建 readline 接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 提示用户输入
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  try {
    // 检查 Coder Agent 服务是否正在运行
    console.log('检查 Coder Agent 服务是否正在运行...');
    try {
      const healthCheck = await fetch('http://localhost:41241', {
        method: 'GET',
        timeout: 3000
      }).catch(err => {
        throw new Error(`无法连接到 Coder Agent 服务: ${err.message}`);
      });
      
      console.log('Coder Agent 服务正在运行。');
    } catch (error) {
      console.error('\n错误: Coder Agent 服务可能没有运行。');
      console.error('请确保您已经运行了 `npm run agents:coder-claude` 命令，并且服务正在监听 http://localhost:41241');
      console.error('详细错误:', error.message);
      return;
    }
    
    // 获取用户输入
    const prompt = await getUserPrompt();
    
    // 创建输出目录
    const outputDir = path.join(__dirname, 'generated-code', Date.now().toString());
    fs.mkdirSync(outputDir, { recursive: true });
    
    console.log(`\n将生成的代码保存到: ${outputDir}\n`);
    
    // 发送请求到 Coder Agent
    console.log('正在发送请求到 Coder Agent...');
    const taskId = uuidv4();
    
    console.log(`使用任务 ID: ${taskId}`);
    console.log('请求内容:', prompt);
    
    let response;
    try {
      response = await fetch('http://localhost:41241', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tasks/send',
          id: 'save-code-task',
          params: {
            id: taskId,
            message: {
              role: 'user',
              parts: [
                {
                  type: 'text',
                  text: prompt
                }
              ]
            }
          }
        })
      });
    } catch (error) {
      console.error('\n发送请求时出错:', error.message);
      console.error('请确保 Coder Agent 服务正在运行，并且可以访问。');
      return;
    }
    
    console.log('收到响应，正在解析...');
    
    let result;
    try {
      result = await response.json();
      console.log('响应状态码:', response.status);
    } catch (error) {
      console.error('\n解析响应时出错:', error.message);
      console.error('响应内容可能不是有效的 JSON。');
      return;
    }
    
    if (result.error) {
      console.error('\n服务器返回错误:', result.error);
      return;
    }
    
    // 打印完整的响应（用于调试）
    console.log('\n完整响应:', JSON.stringify(result, null, 2));
    
    // 检查是否有生成的文件
    if (!result.result) {
      console.error('\n错误: 响应中没有 result 字段。');
      return;
    }
    
    const artifacts = result.result.artifacts;
    if (!artifacts || artifacts.length === 0) {
      console.log('\n没有生成任何文件。');
      console.log('响应中的 artifacts 字段为空或不存在。');
      
      // 检查是否有状态消息
      if (result.result.status && result.result.status.message) {
        console.log('\n状态消息:', result.result.status.message);
      }
      
      return;
    }
    
    // 保存生成的文件
    console.log(`\n生成了 ${artifacts.length} 个文件:\n`);
    
    for (const artifact of artifacts) {
      if (!artifact.name || !artifact.parts || artifact.parts.length === 0) {
        continue;
      }
      
      // 获取文件名和内容
      const fileName = artifact.name;
      const content = artifact.parts[0].text;
      
      // 构建完整的文件路径，保持原始目录结构
      const filePath = path.join(outputDir, fileName);
      
      // 创建必要的子目录
      const fileDir = path.dirname(filePath);
      fs.mkdirSync(fileDir, { recursive: true });
      
      // 写入文件
      fs.writeFileSync(filePath, content);
      
      console.log(`- ${fileName}`);
    }
    
    console.log(`\n所有文件已保存到: ${outputDir}`);
    
  } catch (error) {
    console.error('发生错误:', error);
  } finally {
    rl.close();
  }
}

async function getUserPrompt() {
  console.log('欢迎使用 Coder Agent 代码生成器\n');
  console.log('示例任务:');
  console.log('1. 创建一个简单的 React 计数器组件');
  console.log('2. 编写一个 Python 函数来计算斐波那契数列');
  console.log('3. 创建一个带有表单验证的 HTML 登录页面');
  console.log('4. 编写一个 Node.js Express 服务器，提供简单的 REST API');
  console.log('5. 创建一个使用 CSS Grid 的响应式布局\n');
  
  return await prompt('请输入您的代码生成请求: ');
}

main();
