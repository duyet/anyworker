# Changelog

## [0.1.1](https://github.com/duyet/anyworker/compare/app-v0.1.0...app-v0.1.1) (2026-08-14)


### Features

* **anyworker:** permission policy, activity log and workspace file API ([a00431d](https://github.com/duyet/anyworker/commit/a00431db90ba78b8677a0770082b571a753f5825)), closes [#1](https://github.com/duyet/anyworker/issues/1) [#2](https://github.com/duyet/anyworker/issues/2) [#3](https://github.com/duyet/anyworker/issues/3)
* **anyworker:** real folder picker and reachable plugins ([66c40b0](https://github.com/duyet/anyworker/commit/66c40b0c41a63526b139ea5242229b192524b21d)), closes [#7](https://github.com/duyet/anyworker/issues/7) [#10](https://github.com/duyet/anyworker/issues/10)
* **anyworker:** reconnect dropped sessions and show connection state ([4e664db](https://github.com/duyet/anyworker/commit/4e664db30a73c319ef7e9cb8177030354ba39af8)), closes [#11](https://github.com/duyet/anyworker/issues/11)
* **anyworker:** scaffold product app with Claude Agent SDK server ([0641a3f](https://github.com/duyet/anyworker/commit/0641a3f44fc6d20860693bf4321a4f493a75d7c5))
* **anyworker:** sign in with AnyRouter, model picker, BYOK from the app ([d1181de](https://github.com/duyet/anyworker/commit/d1181de31b3bde98b8ca7cff4ff8eb0801f79eb0))
* **anyworker:** use-case templates for people who don't code ([7f6bdeb](https://github.com/duyet/anyworker/commit/7f6bdeb90d031a4f18032ccf37891f0a618934a3)), closes [#5](https://github.com/duyet/anyworker/issues/5)
* **anyworker:** workspace files, artifact preview and run history ([6538040](https://github.com/duyet/anyworker/commit/6538040470f8032778e2aa6d3e25eb212458f83d)), closes [#8](https://github.com/duyet/anyworker/issues/8) [#9](https://github.com/duyet/anyworker/issues/9)
* CompatRunner + real GUI server connection + right rail + tests ([8dd9c05](https://github.com/duyet/anyworker/commit/8dd9c053f17d27472037c7b96876af1d20cecc12))


### Bug Fixes

* **anyworker:** check res.ok across api.ts ([76a26b0](https://github.com/duyet/anyworker/commit/76a26b049a991abeddc03d4015288edd14f244cc))
* **anyworker:** stop discarding the API key typed in Settings ([6f90a02](https://github.com/duyet/anyworker/commit/6f90a0285c700f90c3971eab43a6832ee3766a6b)), closes [#12](https://github.com/duyet/anyworker/issues/12)


### Refactoring

* **anyworker:** decompose App.tsx into shell, routes and hooks ([5fea5a3](https://github.com/duyet/anyworker/commit/5fea5a3b2327d45d1ba451415661b9233d3a541a)), closes [#4](https://github.com/duyet/anyworker/issues/4)

## [Unreleased]

### Features

- Local agent server (FastAPI + Claude Agent SDK Path A)
- React GUI shell with sessions, AnyRouter settings, approvals
- Product equation: OpenWorker UI direction + CAS + Tauri (shell next) + AnyRouter
