# MarkDownload Manifest V3 升级说明

## 已完成的修改

### 1. Manifest.json 升级
- 从 Manifest V2 升级到 Manifest V3
- 更新权限：将 `<all_urls>` 移动到 `host_permissions`
- 将 `browser_action` 更改为 `action`
- 将 `background.scripts` 更改为 `background.service_worker`
- 添加了 `scripting` 权限以支持动态脚本注入
- 添加了 `content_scripts` 声明以自动注入内容脚本
- **修复**: 移除了 `options_ui` 中不兼容的 `chrome_style` 和 `browser_style` 选项
- **修复**: 将命令 `_execute_browser_action` 改为 `_execute_action`

### 2. Background Script 转换为 Service Worker
- 创建了新的 `src/background/service-worker.js` 文件
- 将所有依赖脚本使用 `importScripts()` 导入
- 更新了所有 Chrome API 调用以适配 Manifest V3
- 使用 `chrome.scripting.executeScript()` 替代 `chrome.tabs.executeScript()`
- 添加了详细的调试日志用于问题排查

### 3. 内容脚本改进
- 添加了详细的调试日志
- 改进了DOM处理和错误处理
- 增强了剪贴板操作的兼容性
- 添加了更好的浏览器API兼容性检查

### 4. 调试功能
- 在所有关键函数中添加了console.log输出
- 添加了错误处理和回退机制
- 提供了详细的操作状态信息

## 测试建议

### 1. 加载扩展
1. 打开 Chrome 浏览器
2. 导航到 `chrome://extensions/`
3. 启用"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `src` 目录

### 2. 测试功能
1. **基本测试**：
   - 右键点击页面，检查是否出现 MarkDownload 上下文菜单
   - 点击扩展图标，检查弹出窗口是否正常显示

2. **核心功能测试**：
   - 测试"Download Tab As Markdown"
   - 测试"Copy Tab As Markdown"
   - 测试选中文本后的"Copy Selection As Markdown"

3. **调试检查**：
   - 打开 Chrome 开发者工具
   - 检查 Console 标签页中的 MarkDownload 日志输出
   - Service Worker 日志可在扩展管理页面的"Service Worker"链接中查看

### 3. 常见问题排查

#### 如果扩展无法加载：
1. 检查 manifest.json 语法是否正确
2. 确保所有引用的文件都存在
3. 查看扩展管理页面的错误信息

**已修复的常见错误：**
- ✅ "The chrome_style option cannot be used with manifest version 3" - 已从 `options_ui` 中移除 `chrome_style` 和 `browser_style`
- ✅ "_execute_browser_action command not recognized" - 已更改为 `_execute_action`

#### 如果功能不工作：
1. 检查 Service Worker 是否运行（在扩展管理页面）
2. 查看浏览器控制台的错误信息
3. 检查 MarkDownload 的调试日志

#### 如果权限问题：
1. 确保网站允许执行脚本
2. 检查是否在受限页面（如 chrome://）上使用
3. 验证 host_permissions 是否正确设置

## 技术细节

### Service Worker 变化
- 不再是持久的背景页面，而是事件驱动的
- 需要使用 `importScripts()` 导入依赖
- API 调用从 `browser.*` 改为 `chrome.*`

### 内容脚本注入
- 从动态注入改为声明式注入
- 使用 `chrome.scripting.executeScript()` 进行必要时的动态注入
- 改进了脚本可用性检查

### 权限模型
- `<all_urls>` 权限移至 `host_permissions`
- 添加了 `scripting` 权限支持动态脚本执行

## 已知限制
- 在某些受保护的页面（如 chrome:// 页面）上无法工作
- Service Worker 在空闲时会被暂停，但会在需要时自动恢复

## 版本兼容性
- 支持 Chrome 88+ (Manifest V3 最低要求)
- 向后兼容原有功能
- 保持与 Firefox 的兼容性（通过 browser-polyfill）
