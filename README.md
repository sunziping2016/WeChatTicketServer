[![Build Status](https://travis-ci.org/sunziping2016/WeChatTicketServer.svg?branch=master)](https://travis-ci.org/sunziping2016/WeChatTicketServer)

# 关于
[本项目](https://github.com/sunziping2016/WeChatTicketServer)是软件工程(3)的示范项目。用于教学。

## 版本维护
我们的版本从“v0.0.0”开始。你应当理解major、minor、patch发布的内涵及其异同。你需要学习使用git tag更好地管理你的“里程碑”（release）的commit。每个commit所做的更改都需要记录到[Changelog]，你应当参照[Keep a Changelog](http://keepachangelog.com/en/1.0.0/)进行记录。日常的开发是在dev分支或其他特定feature、bug相关的分支，阶段性开发完成之后，合并进master分支，并更新[Changelog]。

## 持续集成
我们使用Travis CI进行持续集成。持续继承主要负责了以下3件事：
* 检查代码质量`npm run lint`
* 运行自动测试`npm run test`
* 生成开发文档`npm run docs`并部署到Github Pages上

其中，`config/config.travis.json`依照Travis文档中的[Encrypting Files](https://docs.travis-ci.com/user/encrypting-files/)做了加密。部署Github Pages是依照Travis文档中的[GitHub Pages Deployment](https://docs.travis-ci.com/user/deployment/pages/)。

# 开发

这是项目的[开发文档]链接。之后本文的链接会采用相对链接。因此建议在开发文档内阅览。

* [app模块](module-app.html): 项目的顶层模块，负责程序的启动停止和日志


[Changelog]: https://github.com/sunziping2016/WeChatTicketServer/blob/master/CHANGELOG.md
[开发文档]: https://sunziping2016.github.io/WeChatTicketServer/0.0.1/index.html

