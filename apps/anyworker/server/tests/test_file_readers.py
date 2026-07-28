"""Tests for file-reading tools (txt, pdf, xlsx, csv, md)."""

from pathlib import Path

import pytest
from openpyxl import Workbook

from anyworker.tools.readers import read_csv, read_file, read_pdf, read_text, read_xlsx


def _tmp_dir(tmp_path: Path) -> Path:
    ws = tmp_path / "workspace"
    ws.mkdir(parents=True, exist_ok=True)
    return ws


def _write(tmp_path: Path, rel: str, content: str) -> Path:
    p = tmp_path / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    return p


class TestReadText:
    def test_reads_txt(self, tmp_path: Path) -> None:
        ws = _tmp_dir(tmp_path)
        _write(ws, "hello.txt", "Hello, world!")
        result = read_text(str(ws), "hello.txt")
        assert result["ok"] is True
        assert result["content"] == "Hello, world!"

    def test_reads_md(self, tmp_path: Path) -> None:
        ws = _tmp_dir(tmp_path)
        _write(ws, "notes.md", "# Title\n\nBody text.")
        result = read_text(str(ws), "notes.md")
        assert result["ok"] is True
        assert "# Title" in result["content"]

    def test_missing_file(self, tmp_path: Path) -> None:
        ws = _tmp_dir(tmp_path)
        result = read_text(str(ws), "nonexistent.txt")
        assert result["ok"] is False
        assert "not found" in result["error"]

    def test_path_escape_rejected(self, tmp_path: Path) -> None:
        ws = _tmp_dir(tmp_path)
        result = read_text(str(ws), "../../etc/passwd")
        assert result["ok"] is False
        assert "escapes" in result["error"]


class TestReadCsv:
    def test_reads_csv(self, tmp_path: Path) -> None:
        ws = _tmp_dir(tmp_path)
        _write(ws, "data.csv", "name,age\nAlice,30\nBob,25")
        result = read_csv(str(ws), "data.csv")
        assert result["ok"] is True
        assert result["headers"] == ["name", "age"]
        assert result["row_count"] == 2
        assert result["rows"][0]["name"] == "Alice"

    def test_missing_file(self, tmp_path: Path) -> None:
        ws = _tmp_dir(tmp_path)
        result = read_csv(str(ws), "missing.csv")
        assert result["ok"] is False


class TestReadXlsx:
    def test_reads_xlsx(self, tmp_path: Path) -> None:
        ws = _tmp_dir(tmp_path)
        xlsx_path = ws / "spreadsheet.xlsx"
        wb = Workbook()
        ws_sheet = wb.active
        ws_sheet.title = "Sheet1"
        ws_sheet.append(["name", "score"])
        ws_sheet.append(["Alice", 95])
        ws_sheet.append(["Bob", 87])
        wb.save(str(xlsx_path))
        result = read_xlsx(str(ws), "spreadsheet.xlsx")
        assert result["ok"] is True
        assert "Sheet1" in result["sheets"]
        assert result["sheets"]["Sheet1"]["headers"] == ["name", "score"]
        assert len(result["sheets"]["Sheet1"]["rows"]) == 2

    def test_missing_file(self, tmp_path: Path) -> None:
        ws = _tmp_dir(tmp_path)
        result = read_xlsx(str(ws), "missing.xlsx")
        assert result["ok"] is False


class TestReadPdf:
    def test_reads_pdf(self, tmp_path: Path) -> None:
        ws = _tmp_dir(tmp_path)
        pdf_path = ws / "doc.pdf"
        try:
            import pymupdf

            doc = pymupdf.open()
            page = doc.new_page()
            page.insert_text((50, 50), "Hello from PDF")
            doc.save(str(pdf_path))
            doc.close()
        except Exception:
            pytest.skip("pymupdf PDF creation unavailable")

        result = read_pdf(str(ws), "doc.pdf")
        assert result["ok"] is True
        assert "Hello from PDF" in result["content"]
        assert result["pages"] == 1

    def test_missing_file(self, tmp_path: Path) -> None:
        ws = _tmp_dir(tmp_path)
        result = read_pdf(str(ws), "missing.pdf")
        assert result["ok"] is False


class TestReadFileDispatcher:
    def test_dispatches_txt_to_text(self, tmp_path: Path) -> None:
        ws = _tmp_dir(tmp_path)
        _write(ws, "file.txt", "plain text")
        result = read_file(str(ws), "file.txt")
        assert result["ok"] is True
        assert result["content"] == "plain text"

    def test_dispatches_csv_to_csv(self, tmp_path: Path) -> None:
        ws = _tmp_dir(tmp_path)
        _write(ws, "data.csv", "a,b\n1,2")
        result = read_file(str(ws), "data.csv")
        assert result["ok"] is True
        assert "headers" in result

    def test_dispatches_md_to_text(self, tmp_path: Path) -> None:
        ws = _tmp_dir(tmp_path)
        _write(ws, "doc.md", "# Heading")
        result = read_file(str(ws), "doc.md")
        assert result["ok"] is True
        assert "# Heading" in result["content"]

    def test_missing_file(self, tmp_path: Path) -> None:
        ws = _tmp_dir(tmp_path)
        result = read_file(str(ws), "nope.txt")
        assert result["ok"] is False


def test_list_supported_extensions() -> None:
    from anyworker.tools import list_supported_extensions

    exts = [".txt", ".md", ".csv", ".pdf", ".xlsx", ".xls", ".log", ".json", ".py"]
    for e in exts:
        assert e in list_supported_extensions()
