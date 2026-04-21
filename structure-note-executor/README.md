# structure-note-executor

Voice-pipeline の構造化ノート生成を担う FastAPI サービス。

## Setup

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

## Endpoints

- `GET /health` - ヘルスチェック
- `POST /execute` - 構造化ノート生成（P0: ダミー応答）
