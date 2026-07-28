"""GitHub integration — repo browsing, PR management, issue management."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from httpx import AsyncClient, Timeout

from anyworker.server.manager import SessionManager


log = logging.getLogger(__name__)

GITHUB_API_BASE = "https://api.github.com"


def _token_for(manager: SessionManager) -> str:
    account = manager.secrets.get_account()
    token = account.get("management_key") or account.get("api_key") or ""
    if not token:
        raise HTTPException(status_code=401, detail="No GitHub token configured")
    return token


async def _gh_get(token: str, path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    async with AsyncClient(
        base_url=GITHUB_API_BASE,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
        timeout=Timeout(15.0),
    ) as client:
        resp = await client.get(path, params=params)
        if resp.status_code == 404:
            raise HTTPException(status_code=404, detail=f"GitHub resource not found: {path}")
        resp.raise_for_status()
        return resp.json()


async def _gh_post(token: str, path: str, json: dict[str, Any] | None = None) -> dict[str, Any]:
    async with AsyncClient(
        base_url=GITHUB_API_BASE,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
        timeout=Timeout(15.0),
    ) as client:
        resp = await client.post(path, json=json)
        resp.raise_for_status()
        return resp.json()


def build_router(manager: SessionManager) -> APIRouter:
    router = APIRouter(prefix="/v1/github", tags=["github"])

    @router.get("/me")
    async def me() -> dict[str, Any]:
        token = _token_for(manager)
        user = await _gh_get(token, "/user")
        return {
            "login": user.get("login"),
            "name": user.get("name"),
            "avatar_url": user.get("avatar_url"),
            "html_url": user.get("html_url"),
        }

    @router.get("/repos/{owner}/{repo}")
    async def repo(owner: str, repo: str) -> dict[str, Any]:
        token = _token_for(manager)
        data = await _gh_get(token, f"/repos/{owner}/{repo}")
        return {
            "full_name": data.get("full_name"),
            "name": data.get("name"),
            "owner": data.get("owner", {}).get("login"),
            "html_url": data.get("html_url"),
            "description": data.get("description"),
            "language": data.get("language"),
            "stargazers_count": data.get("stargazers_count"),
            "forks_count": data.get("forks_count"),
            "open_issues_count": data.get("open_issues_count"),
            "default_branch": data.get("default_branch"),
        }

    @router.get("/repos/{owner}/{repo}/pulls")
    async def list_prs(owner: str, repo: str, state: str = "open", limit: int = 20) -> dict[str, Any]:
        token = _token_for(manager)
        prs = await _gh_get(
            token, f"/repos/{owner}/{repo}/pulls",
            params={"state": state, "per_page": limit, "sort": "updated", "direction": "desc"},
        )
        return {
            "prs": [
                {
                    "number": p.get("number"),
                    "title": p.get("title"),
                    "state": p.get("state"),
                    "head": p.get("head", {}).get("ref"),
                    "base": p.get("base", {}).get("ref"),
                    "html_url": p.get("html_url"),
                    "updated_at": p.get("updated_at"),
                    "created_at": p.get("created_at"),
                }
                for p in prs
            ]
        }

    @router.get("/repos/{owner}/{repo}/pulls/{pr_number}")
    async def get_pr(owner: str, repo: str, pr_number: int) -> dict[str, Any]:
        token = _token_for(manager)
        pr = await _gh_get(token, f"/repos/{owner}/{repo}/pulls/{pr_number}")
        return {
            "number": pr.get("number"),
            "title": pr.get("title"),
            "state": pr.get("state"),
            "body": pr.get("body"),
            "head": pr.get("head", {}).get("ref"),
            "base": pr.get("base", {}).get("ref"),
            "html_url": pr.get("html_url"),
            "updated_at": pr.get("updated_at"),
            "created_at": pr.get("created_at"),
        }

    @router.get("/repos/{owner}/{repo}/pulls/{pr_number}/files")
    async def get_pr_files(owner: str, repo: str, pr_number: int) -> dict[str, Any]:
        token = _token_for(manager)
        files = await _gh_get(token, f"/repos/{owner}/{repo}/pulls/{pr_number}/files")
        return {
            "files": [
                {
                    "filename": f.get("filename"),
                    "status": f.get("status"),
                    "additions": f.get("additions"),
                    "deletions": f.get("deletions"),
                    "changes": f.get("changes"),
                    "patch": f.get("patch"),
                }
                for f in files
            ]
        }

    @router.post("/repos/{owner}/{repo}/pulls")
    async def create_pr(owner: str, repo: str, title: str, body: str, head: str, base: str = "main") -> dict[str, Any]:
        token = _token_for(manager)
        pr = await _gh_post(
            token,
            f"/repos/{owner}/{repo}/pulls",
            json={"title": title, "body": body, "head": head, "base": base},
        )
        return {"number": pr.get("number"), "html_url": pr.get("html_url"), "title": pr.get("title")}

    @router.put("/repos/{owner}/{repo}/pulls/{pr_number}/merge")
    async def merge_pr(owner: str, repo: str, pr_number: int, merge_method: str = "merge") -> dict[str, Any]:
        token = _token_for(manager)
        result = await _gh_post(
            token,
            f"/repos/{owner}/{repo}/pulls/{pr_number}/merge",
            json={"merge_method": merge_method},
        )
        return {"merged": result.get("merged"), "sha": result.get("sha")}

    @router.get("/repos/{owner}/{repo}/issues")
    async def list_issues(owner: str, repo: str, state: str = "open", limit: int = 20) -> dict[str, Any]:
        token = _token_for(manager)
        issues = await _gh_get(
            token, f"/repos/{owner}/{repo}/issues",
            params={"state": state, "per_page": limit, "sort": "updated", "direction": "desc"},
        )
        return {
            "issues": [
                {
                    "number": i.get("number"),
                    "title": i.get("title"),
                    "state": i.get("state"),
                    "labels": [label.get("name") for label in i.get("labels", [])],
                    "html_url": i.get("html_url"),
                    "updated_at": i.get("updated_at"),
                    "created_at": i.get("created_at"),
                }
                for i in issues
            ]
        }

    @router.post("/repos/{owner}/{repo}/issues")
    async def create_issue(owner: str, repo: str, title: str, body: str | None = None) -> dict[str, Any]:
        token = _token_for(manager)
        issue = await _gh_post(
            token,
            f"/repos/{owner}/{repo}/issues",
            json={"title": title, "body": body or ""},
        )
        return {"number": issue.get("number"), "html_url": issue.get("html_url"), "title": issue.get("title")}

    @router.put("/repos/{owner}/{repo}/issues/{issue_number}")
    async def update_issue(owner: str, repo: str, issue_number: int, state: str) -> dict[str, Any]:
        token = _token_for(manager)
        issue = await _gh_post(
            token,
            f"/repos/{owner}/{repo}/issues/{issue_number}",
            json={"state": state},
        )
        return {"number": issue.get("number"), "state": issue.get("state")}

    @router.get("/repos/{owner}/{repo}/contents/{path:path}")
    async def get_contents(owner: str, repo: str, path: str, ref: str = "main") -> dict[str, Any]:
        token = _token_for(manager)
        data = await _gh_get(token, f"/repos/{owner}/{repo}/contents/{path}", params={"ref": ref})
        if isinstance(data, list):
            return {
                "type": "dir",
                "entries": [
                    {"name": e.get("name"), "path": e.get("path"), "type": e.get("type")}
                    for e in data
                ],
            }
        return {
            "type": "file",
            "name": data.get("name"),
            "path": data.get("path"),
            "sha": data.get("sha"),
            "download_url": data.get("download_url"),
        }

    return router
