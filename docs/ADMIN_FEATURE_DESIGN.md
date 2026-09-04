# TeacherOS 管理端功能设计

> 版本：v1.0
> 日期：2026-09-03
> 功能模块：教师（用户）管理、消息推送

---

## 一、整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      管理端（Admin Web）                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   教师管理      │  │   消息推送      │  │  数据看板   │ │
│  │   Teacher Mgmt  │  │   Notification  │  │  Dashboard  │ │
│  └────────┬────────┘  └────────┬────────┘  └──────┬──────┘ │
│           │                    │                   │        │
│           └────────────────────┼───────────────────┘        │
│                                ▼                            │
│                    ┌─────────────────────┐                  │
│                    │   Admin API 层      │                  │
│                    │   /admin/**         │                  │
│                    └──────────┬──────────┘                  │
└───────────────────────────────┼─────────────────────────────┘
                                │
┌───────────────────────────────┼─────────────────────────────┐
│                      后端服务（Server）                       │
│  ┌────────────────────────────┼─────────────────────────┐   │
│  │         Admin Controller   │    Admin Service        │   │
│  │         /api/admin/**      │    (权限校验)            │   │
│  └────────────────────────────┼─────────────────────────┘   │
│                               ▼                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              现有业务模块（复用）                      │   │
│  │   auth / course / notification / organization ...   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、教师（用户）管理

### 2.1 功能概述

平台管理员可以查看、管理所有注册教师账号，包括查看教师详情、禁用/启用账号、重置密码等操作。

### 2.2 页面设计

#### 2.2.1 教师列表页

| 元素 | 说明 |
|------|------|
| **筛选区** | 状态筛选（全部/正常/已禁用）、注册时间范围、关键词搜索（用户名/昵称/邮箱） |
| **数据表格** | 头像、用户名、昵称、邮箱、手机号、任教学科、注册时间、状态、操作 |
| **操作列** | 查看详情、禁用/启用、重置密码 |
| **分页** | 服务端分页，默认 20 条/页 |

**状态标识：**
- 🟢 正常：可正常登录使用
- 🔴 已禁用：无法登录，提示"账号已被禁用"

#### 2.2.2 教师详情页（抽屉/弹窗）

**基本信息区：**
- 头像、用户名、昵称、邮箱、手机号
- 任教学科、注册时间、最后登录时间
- 账号状态（正常/已禁用）

**统计数据区：**
| 统计项 | 说明 |
|--------|------|
| 课程总数 | 该教师创建的所有课程数量 |
| 本月课程数 | 当月创建的课程数量 |
| 学生数量 | 关联的学生数量（去重） |
| 机构数量 | 关联的机构数量 |
| 累计收入 | 所有已结束课程的费用总和 |
| 本月收入 | 当月已结束课程的费用总和 |

**操作区：**
- 禁用/启用账号（二次确认）
- 重置密码（生成随机密码，通过邮件发送）
- 查看该教师的课程列表（跳转）

### 2.3 接口设计

#### 2.3.1 教师列表

```http
POST /api/admin/teachers/page
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "pageNum": 1,
  "pageSize": 20,
  "status": "active",        // 可选：active/disabled
  "keyword": "张老师",        // 可选：用户名/昵称/邮箱模糊搜索
  "startDate": "2026-01-01", // 可选：注册开始日期
  "endDate": "2026-12-31"    // 可选：注册结束日期
}
```

**响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total": 156,
    "list": [
      {
        "id": 1001,
        "username": "zhangsan",
        "nickname": "张老师",
        "email": "zhangsan@example.com",
        "phone": "138****1234",
        "avatar": "/uploads/avatar/xxx.jpg",
        "subjects": "数学,物理",
        "status": "active",
        "createdAt": "2026-01-15T08:30:00",
        "lastLoginAt": "2026-09-03T10:20:00",
        "courseCount": 45,
        "studentCount": 12,
        "organizationCount": 3,
        "totalIncome": 25600.00,
        "monthIncome": 3200.00
      }
    ]
  }
}
```

#### 2.3.2 教师详情

```http
POST /api/admin/teachers/detail
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "id": 1001
}
```

**响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1001,
    "username": "zhangsan",
    "nickname": "张老师",
    "email": "zhangsan@example.com",
    "phone": "138****1234",
    "avatar": "/uploads/avatar/xxx.jpg",
    "subjects": "数学,物理",
    "status": "active",
    "createdAt": "2026-01-15T08:30:00",
    "lastLoginAt": "2026-09-03T10:20:00",
    "stats": {
      "courseCount": 45,
      "monthCourseCount": 8,
      "studentCount": 12,
      "organizationCount": 3,
      "totalIncome": 25600.00,
      "monthIncome": 3200.00
    }
  }
}
```

#### 2.3.3 禁用/启用教师

```http
POST /api/admin/teachers/status
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "id": 1001,
  "status": "disabled",  // active/disabled
  "reason": "违反平台规则"  // 可选：禁用原因
}
```

#### 2.3.4 重置密码

```http
POST /api/admin/teachers/reset-password
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "id": 1001
}
```

**响应：**
```json
{
  "code": 0,
  "message": "新密码已发送至教师邮箱"
}
```

### 2.4 数据库变更

```sql
-- user 表新增字段
ALTER TABLE `user` ADD COLUMN `status` VARCHAR(20) DEFAULT 'active' COMMENT '账号状态：active/disabled';
ALTER TABLE `user` ADD COLUMN `last_login_at` DATETIME NULL COMMENT '最后登录时间';
ALTER TABLE `user` ADD COLUMN `disabled_reason` VARCHAR(500) NULL COMMENT '禁用原因';
ALTER TABLE `user` ADD COLUMN `disabled_at` DATETIME NULL COMMENT '禁用时间';
ALTER TABLE `user` ADD COLUMN `disabled_by` BIGINT NULL COMMENT '操作人ID';

-- 管理员操作日志表（可选，用于审计）
CREATE TABLE IF NOT EXISTS `admin_operation_log` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `admin_id` BIGINT NOT NULL COMMENT '操作管理员ID',
  `target_type` VARCHAR(50) NOT NULL COMMENT '操作对象类型：teacher/course等',
  `target_id` BIGINT NOT NULL COMMENT '操作对象ID',
  `operation` VARCHAR(100) NOT NULL COMMENT '操作类型：disable/enable/reset_password等',
  `detail` TEXT COMMENT '操作详情',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_admin_id` (`admin_id`),
  INDEX `idx_target` (`target_type`, `target_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员操作日志表';
```

---

## 三、消息推送

### 3.1 功能概述

平台管理员可以向所有教师或特定教师发送系统通知，支持公告、活动、提醒等多种类型。

### 3.2 页面设计

#### 3.2.1 消息列表页

| 元素 | 说明 |
|------|------|
| **筛选区** | 消息类型（全部/公告/活动/提醒）、状态（全部/已发布/草稿）、时间范围 |
| **数据表格** | 标题、类型、目标范围、发送时间、状态、阅读量、操作 |
| **操作列** | 查看、编辑（草稿）、发布（草稿）、撤回（已发布）、删除 |

#### 3.2.2 消息编辑页

**基本信息：**
- 消息标题（必填，100字以内）
- 消息类型：公告/活动/提醒
- 消息内容（富文本编辑器，支持图片、链接）

**目标范围：**
- 单选：全部教师 / 指定教师
- 指定教师时：多选教师列表（支持搜索）

**发布设置：**
- 立即发布 / 定时发布（选择未来时间）
- 是否需要确认已读（开启后教师端显示"确认已读"按钮）

**预览区：**
- 实时预览消息在教师端的展示效果

#### 3.2.3 消息详情页

- 消息完整内容展示
- 阅读统计：总阅读数、阅读率、已读/未读教师列表
- 操作：撤回消息、复制消息（创建副本）

### 3.3 教师端展示

**入口：** 顶部导航铃铛图标（与现有提醒中心合并）

**消息分类标签：**
- 全部
- 系统公告（管理员发布）
- 课程提醒（现有功能）

**消息卡片：**
```
┌─────────────────────────────────────┐
│ 🔴 【公告】系统维护通知              │
│                                     │
│ 尊敬的老师，系统将于本周六凌晨        │
│ 2:00-4:00 进行维护升级...           │
│                                     │
│ 发布时间：2026-09-03 14:30          │
│ [确认已读]  [查看详情]               │
└─────────────────────────────────────┘
```

### 3.4 接口设计

#### 3.4.1 消息列表（管理端）

```http
POST /api/admin/messages/page
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "pageNum": 1,
  "pageSize": 20,
  "type": "announcement",    // 可选：announcement/activity/reminder
  "status": "published",     // 可选：draft/published/revoked
  "startDate": "2026-01-01",
  "endDate": "2026-12-31"
}
```

#### 3.4.2 创建消息

```http
POST /api/admin/messages
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "title": "系统维护通知",
  "type": "announcement",        // announcement/activity/reminder
  "content": "<p>尊敬的老师...</p>",
  "targetType": "all",           // all/specific
  "targetIds": [1001, 1002],     // targetType=specific 时必填
  "publishType": "immediate",    // immediate/scheduled
  "publishTime": null,           // scheduled 时必填
  "needConfirm": true            // 是否需要确认已读
}
```

#### 3.4.3 更新消息

```http
PUT /api/admin/messages/{id}
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "title": "系统维护通知（更新）",
  "content": "<p>更新后的内容...</p>"
}
```

#### 3.4.4 发布/撤回消息

```http
POST /api/admin/messages/{id}/publish   // 发布
POST /api/admin/messages/{id}/revoke    // 撤回
```

#### 3.4.5 消息阅读统计

```http
POST /api/admin/messages/{id}/stats
```

**响应：**
```json
{
  "code": 0,
  "data": {
    "totalTarget": 156,
    "readCount": 89,
    "readRate": 57.05,
    "readList": [
      {"teacherId": 1001, "nickname": "张老师", "readAt": "2026-09-03T15:00:00"}
    ],
    "unreadList": [
      {"teacherId": 1002, "nickname": "李老师"}
    ]
  }
}
```

#### 3.4.6 教师端获取消息

```http
POST /api/messages/list
Content-Type: application/json
Authorization: Bearer <teacher_token>

{
  "type": "announcement",  // 可选
  "limit": 20
}
```

#### 3.4.7 教师端标记已读

```http
POST /api/messages/{id}/read
```

### 3.5 数据库变更

```sql
-- 消息表
CREATE TABLE IF NOT EXISTS `admin_message` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `title` VARCHAR(200) NOT NULL COMMENT '消息标题',
  `type` VARCHAR(20) NOT NULL COMMENT '消息类型：announcement/activity/reminder',
  `content` TEXT NOT NULL COMMENT '消息内容（HTML）',
  `target_type` VARCHAR(20) NOT NULL COMMENT '目标类型：all/specific',
  `target_ids` JSON NULL COMMENT '目标教师ID列表（target_type=specific时）',
  `publish_type` VARCHAR(20) NOT NULL COMMENT '发布类型：immediate/scheduled',
  `publish_time` DATETIME NULL COMMENT '定时发布时间',
  `need_confirm` TINYINT(1) DEFAULT 0 COMMENT '是否需要确认已读',
  `status` VARCHAR(20) DEFAULT 'draft' COMMENT '状态：draft/published/revoked',
  `published_at` DATETIME NULL COMMENT '实际发布时间',
  `revoked_at` DATETIME NULL COMMENT '撤回时间',
  `created_by` BIGINT NOT NULL COMMENT '创建人ID',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_status` (`status`),
  INDEX `idx_type` (`type`),
  INDEX `idx_publish_time` (`publish_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员消息表';

-- 消息阅读记录表
CREATE TABLE IF NOT EXISTS `admin_message_read` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `message_id` BIGINT NOT NULL COMMENT '消息ID',
  `teacher_id` BIGINT NOT NULL COMMENT '教师ID',
  `read_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '阅读时间',
  `confirmed` TINYINT(1) DEFAULT 0 COMMENT '是否确认已读',
  `confirmed_at` DATETIME NULL COMMENT '确认时间',
  UNIQUE KEY `uk_message_teacher` (`message_id`, `teacher_id`),
  INDEX `idx_teacher` (`teacher_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='消息阅读记录表';

-- 定时发布任务表（可选，用于处理定时消息）
CREATE TABLE IF NOT EXISTS `admin_message_schedule` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `message_id` BIGINT NOT NULL COMMENT '消息ID',
  `publish_time` DATETIME NOT NULL COMMENT '计划发布时间',
  `executed` TINYINT(1) DEFAULT 0 COMMENT '是否已执行',
  `executed_at` DATETIME NULL COMMENT '执行时间',
  INDEX `idx_publish_time` (`publish_time`, `executed`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='消息定时发布任务表';
```

---

## 四、权限设计

### 4.1 角色定义

| 角色 | 说明 | 权限 |
|------|------|------|
| `TEACHER` | 普通教师 | 使用现有教师端功能 |
| `ADMIN` | 平台管理员 | 使用管理端功能 + 教师端功能 |
| `SUPER_ADMIN` | 超级管理员 | 管理管理员账号 + 所有权限 |

### 4.2 权限控制

**前端路由守卫：**
```javascript
// 管理端路由
{
  path: '/admin',
  component: AdminLayout,
  meta: { requiresAuth: true, requiresAdmin: true },
  children: [
    { path: 'teachers', component: TeacherManagement },
    { path: 'messages', component: MessageManagement }
  ]
}
```

**后端拦截器：**
```java
// AdminInterceptor.java
@Component
public class AdminInterceptor implements HandlerInterceptor {
    @Override
    public boolean preHandle(HttpServletRequest request, ...) {
        Long userId = UserContext.getUserId();
        User user = userMapper.findById(userId);
        if (!"ADMIN".equals(user.getRole()) && !"SUPER_ADMIN".equals(user.getRole())) {
            throw new BusinessException(403, "无权限访问");
        }
        return true;
    }
}
```

### 4.3 数据库角色字段

```sql
-- user 表 role 字段扩展
ALTER TABLE `user` MODIFY COLUMN `role` VARCHAR(20) DEFAULT 'TEACHER' COMMENT '角色：TEACHER/ADMIN/SUPER_ADMIN';

-- 创建初始管理员账号（示例）
INSERT INTO `user` (username, password, nickname, email, role, status)
VALUES ('admin', '$2a$10$...', '系统管理员', 'admin@teacheros.com', 'SUPER_ADMIN', 'active');
```

---

## 五、前端目录结构

```
src/
├── api/
│   ├── admin/
│   │   ├── teacher.js      # 教师管理接口
│   │   └── message.js      # 消息管理接口
│   └── ...（现有接口）
├── views/
│   ├── admin/
│   │   ├── layout/
│   │   │   └── AdminLayout.vue      # 管理端布局
│   │   ├── teachers/
│   │   │   ├── index.vue            # 教师列表
│   │   │   ├── components/
│   │   │   │   ├── TeacherTable.vue
│   │   │   │   ├── TeacherDetailDrawer.vue
│   │   │   │   └── ResetPasswordDialog.vue
│   │   ├── messages/
│   │   │   ├── index.vue            # 消息列表
│   │   │   ├── edit.vue             # 消息编辑
│   │   │   ├── detail.vue           # 消息详情（含统计）
│   │   │   └── components/
│   │   │       ├── MessageForm.vue
│   │   │       ├── TeacherSelector.vue
│   │   │       └── ReadStatsTable.vue
│   └── ...（现有页面）
└── router/
    └── index.js  # 新增管理端路由
```

---

## 六、实施计划

### Phase 1：基础框架（1-2天）
- [ ] 数据库表结构创建
- [ ] 后端 Admin 模块基础框架（Controller/Service/Mapper）
- [ ] 权限拦截器
- [ ] 前端管理端路由与布局

### Phase 2：教师管理（2-3天）
- [ ] 教师列表接口与页面
- [ ] 教师详情接口与页面
- [ ] 禁用/启用功能
- [ ] 重置密码功能（含邮件发送）

### Phase 3：消息推送（3-4天）
- [ ] 消息 CRUD 接口
- [ ] 消息编辑页面（富文本）
- [ ] 教师选择器组件
- [ ] 定时发布功能
- [ ] 教师端消息展示
- [ ] 阅读统计功能

### Phase 4：优化与测试（1-2天）
- [ ] 操作日志记录
- [ ] 单元测试
- [ ] 集成测试

**总计：约 7-11 天**

---

## 七、注意事项

1. **邮件服务**：重置密码功能依赖邮件服务，需确保 SMTP 配置正确
2. **消息推送频率**：建议限制管理员发送消息频率，避免骚扰教师
3. **敏感操作审计**：禁用账号、重置密码等操作需记录日志
4. **性能考虑**：消息目标为全部教师时，采用异步方式批量插入阅读记录
5. **前端富文本**：建议使用成熟的富文本编辑器（如 wangEditor、TinyMCE）
