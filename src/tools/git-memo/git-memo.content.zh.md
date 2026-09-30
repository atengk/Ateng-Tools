## 全局配置 (Configuration)

配置全局用户信息：

```shell
git config --global user.name "[你的名字]"
git config --global user.email "[你的邮箱]"
```

## 新建与克隆 (Get started)

在当前目录初始化 Git 仓库：

```shell
git init
```

克隆已有远程仓库：

```shell
git clone [仓库地址]
```

## 提交变更 (Commit)

提交所有已追踪的修改文件：

```shell
git commit -am "[提交说明]"
```

将当前工作区的修改追加合并到上一次提交（不修改提交信息）：

```shell
git commit --amend --no-edit
```

## 撤销与容错 (I've made a mistake)

修改上一次提交的说明信息：

```shell
git commit --amend
```

撤销最近一次提交并保留工作区改动：

```shell
git reset HEAD~1
```

撤销最近 N 次提交并保留工作区改动：

```shell
git reset HEAD~N
```

彻底撤销最近一次提交并放弃所有修改（危险操作）：

```shell
git reset HEAD~1 --hard
```

强制将本地分支重置对齐到远端分支状态：

```shell
git fetch origin
git reset --hard origin/[分支名称]
```

## 其他常用操作 (Miscellaneous)

将本地 master 分支重命名为 main：

```shell
git branch -m master main
```
