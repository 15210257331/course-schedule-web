# TeacherOS 前端（course-schedule-web）

TeacherOS · 兼职教师工作台的前端，技术栈：Vue 3 + Vite + Element Plus + Pinia + Vue Router + ECharts + axios + dayjs。

> 功能需求与接口说明见本仓库 `docs/` 目录下的《项目功能需求说明书》。

## 运行环境

| 项 | 说明 |
|---|---|
| Node.js | >= 18 |
| 包管理 | npm |
| 开发端口 | 5173 |
| 后端代理 | `/api` → `http://localhost:8080`（见 `vite.config.js`） |
| 接口基地址 | `VITE_API_BASE`，默认 `/api` |

## 本地启动

```bash
npm install     # 安装依赖
npm run dev     # 启动开发服务器
npm run build   # 生产构建
npm run preview # 预览构建产物
```

## 生产部署

生产构建产物部署到 Nginx，将 `/api` 反向代理到后端服务（`deploy.config.cjs` 中代理到 `http://140.143.168.25:9999`，可按需修改）。

```bash
npm run build
# 将 dist/ 目录内容发布到 Nginx，并配置 /api 反向代理到后端
```
