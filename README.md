# CNODE
## 使用场景
你是否遇到项目私有化的烦恼，一个标准化产品能拷贝十份出来改成某某客户专享版，比起拷贝出来修改更可怕的是你还持续要维护他！！
cnode，私有化项目一个bug只要改一遍！

## 项目原理
- 将不同路径的src-xx基于src-main编译成最终私有化版本的src交给编译器编译，不影响编译流程，只帮你混合代码
- 允许多层覆盖如```node cnode xxx aaa```即 aaa 覆盖 xxx 覆盖 main

## 项目结构
- src-main 标准化目录，所有的产品最终与main混合 main的覆盖优先级永远最低
- src-xxx  xxx公司私有代码，只需要保存相同路径需要修改的文件即可
- src-aaa  aaa公司私有代码
- cnode.js cnode脚本
- package.json
- ...其他该项目需要的编译配置文件

## 常用文件格式
### 新增
```
/src-main/views/home/top.vue 在其他参与编译的包中无匹配逻辑 直接导出至src目录
/src-xxxx/views/home/index.vue 在src-main中无匹配逻辑 直接导出至src目录
```
### 覆盖
```
/src-main/views/home/index.vue
/src-xxxx/views/home/index.vue 同名同路径 覆盖main中文件并导出至src目录
```
### env覆盖
```
/src-main/views/home/index.vue
/src-xxxx/views/home/index.dev.vue 仅在node cnode xxxx dev时参与混合， 选项有 dev、pro、test
```

### 追加
```
/src-main/views/home/index.scss
/src-xxxx/views/home/index@push.scss 同名同路径@push 在对应文件后追加新文件内容并导出至src目录
```

## 其他
### serve模式
```
node cnode xxxx --mode=serve 时，不会执行 npm run dev命令,不会持续监听文件修改， 一般用于jenkins打包使用
```
### .cnode文件
一行一个，第一个是main，后面是其他参与混合的包
如 node cnode xxx aaa 即：
```
main
xxx
aaa
```
解释：
```
main 最终导出至src
xxx 覆盖main
aaa 覆盖xxx
```

## 最佳实践
- 将项目容器作为一个 Git 主仓库，src-main、src-xxx、src-aaa 等等业务代码作为子仓库，各子仓库的更新一目了然。
- 可以将 node cnode xxxx 命令写入 package.json 的快速启动命令中。

