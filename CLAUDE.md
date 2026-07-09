# Hoshino — AI Agent 学习导师

## 项目定位

Hoshino 是一个 Electron 桌面应用，以「星野老师」角色提供 AI Agent 工程教学。核心能力：对话式教学、课程进度追踪、Obsidian 知识库集成。

## 技术架构

```
Electron 桌面壳
├── Main Process (Node.js)     ← LLM 调用、SQLite、IPC
│   ├── database.ts            ← sql.js (SQLite/WASM)
│   ├── llm-service.ts         ← DeepSeek API (OpenAI 兼容)
│   ├── ipc-handlers.ts        ← 14 个 IPC 通道
│   ├── context-manager.ts     ← TODO: 统一上下文管理
│   └── obsidian-bridge.ts     ← Vault 读写扫描
├── Preload (contextBridge)    ← 安全暴露 API 给渲染进程
├── Renderer (React + Vite)    ← UI
│   ├── hooks/useChat.ts       ← 聊天状态 + 流式接收
│   ├── hooks/usePersona.ts    ← 角色配置
│   ├── components/            ← ChatView、Sidebar 等
│   └── lib/context.ts         ← 前端上下文工具 (部分未使用)
└── Shared (TypeScript)        ← 类型、常量、IPC 通道名
```

## 快速开始

```bash
npm install              # 安装依赖 (sql.js 纯 JS，无需编译)
npm run dev              # 启动 Electron + Vite 开发模式
npm run build            # 生产构建
```

**注意**：运行前需在设置面板配置 DeepSeek API Key。

## 数据层

- **数据库**：SQLite via `sql.js`（WASM，无原生依赖）
- **表结构**：persona、settings、progress、sessions、messages、obsidian_notes
- **存储位置**：`app.getPath('userData')/hoshino.db`
- **WAL 模式**，写入在 close() 时落盘

## 课程数据

- 位置：`data/curriculum.json`
- 结构：Stage → Module → Topic，5 个 Stage（0-4）
- 运行时通过 `CURRICULUM_LOAD` IPC 加载

## 当前状态与已知问题

### 需要关注的技术债

1. **上下文窗口未强制管理**：定义了 `MAX_CONTEXT_TOKENS=6000` 但未在运行时执行
2. **模型/Provider 硬编码**：`llm-service.ts` 写死了 `deepseek-chat`，未读取 DB 配置
3. **Stage 参数未注入**：IPC handler 传 `null` 给 system prompt builder
4. **消息重复存储**：CHAT_SEND 和 streamChatResponse 各存一次
5. **会话历史无法加载**：缺少按 session 查询 messages 的 IPC handler
6. **compressHistory 未调用**：存在但无调用点
7. **Obsidian 上下文未注入**：bridge 可用但输出不进 system prompt
8. **renderer/lib/llm.ts 为死代码**：DeepSeekProvider 从未实例化
9. **renderer/lib/context.ts 为死代码**：buildSystemPrompt 仅在主进程版生效

### 项目规范

- 所有 IPC 通道名定义在 `src/shared/constants.ts` → `IPC_CHANNELS`
- 主进程代码在 `src/main/`，渲染进程在 `src/renderer/`
- 新功能先在 `src/shared/types.ts` 定义类型
- 数据库迁移在 `src/main/database.ts` 的 `MIGRATIONS` 数组追加
- UI 使用 Tailwind CSS

## 相关资源

- AgentGuide 参考：https://github.com/adongwanai/AgentGuide
- agent-ready-template 模式：https://github.com/adongwanai/agent-ready-template
