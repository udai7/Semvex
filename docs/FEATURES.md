# Features — endpoint & file map

Every feature added on top of the base three-mode search, with where it lives.

## Search intelligence
| Feature | Endpoint(s) | Code |
|---|---|---|
| Keyword / semantic / hybrid | `/search/{keyword,semantic,hybrid}` | `catalog.py` `_keyword_scores` / `_semantic_scores` / `_hybrid_scores` |
| Compare (all three at once) | `/search/compare` | `main.py::search_compare` |
| Tunable α weighting | `?alpha=` on hybrid/compare | `catalog.py::_hybrid_scores` |
| Cross-encoder reranking | `?rerank=true` | `catalog.py::Reranker` (fallback: lexical overlap) |
| MMR diversity | `?diversity=true` | `catalog.py::_mmr` |
| Natural-language price filters | any search `q` | `catalog.py::parse_nl_filters` |
| Explicit facet filters | `?category=&brand=&min_price=&max_price=` | `catalog.py::_passes` |
| Did-you-mean | returned in search response | `catalog.py::did_you_mean` (difflib) |
| Autocomplete | `/suggest?q=` | `catalog.py::suggest` |

## Proof / analytics
| Feature | Endpoint(s) | Code |
|---|---|---|
| Live NDCG/Recall/MRR | in `/search/compare`, `/eval/live` | `main.py::_live_metrics` + `eval/evaluate.py::LABELS` |
| Per-mode latency | `took_ms` in responses | `main.py::_run` / `search_compare` |
| Result overlap | `overlap` in compare | `main.py::search_compare` |
| Relevance feedback | `POST /feedback` | `store.py::record_feedback` |
| Click tracking | `POST /click` | `store.py::log_click` |
| Admin dashboard | `GET /admin/analytics` | `store.py::analytics_summary` |
| Offline eval harness | `python -m eval.evaluate` | `eval/evaluate.py` |

## Accounts & auth
| Feature | Endpoint(s) | Code |
|---|---|---|
| Email + password | `/auth/signup` `/auth/login` | `security.py` (PBKDF2) |
| TOTP 2FA | `/auth/totp/{provision,enable,verify}` | `security.py` (RFC-6238) |
| Backup codes | issued at enable, accepted at verify | `security.py::generate_backup_codes`, `store.py::consume_backup_code` |
| Google OAuth | `/auth/google/{start,callback}` | `main.py` |
| Rate limiting | all auth endpoints | `main.py::_rate_limit` |
| Favorites | `/me/favorites` (GET/POST/DELETE) | `store.py` |
| Recently viewed | `/me/recently-viewed` | `store.py::record_view` (on product view) |
| Saved searches | `/me/saved-searches` (GET/POST/DELETE) | `store.py` |

## Discovery
| Feature | Endpoint(s) | Code |
|---|---|---|
| Product detail | `/product/{sku}` | `main.py::product` |
| Similar products (kNN) | in product response | `catalog.py::similar` |
| Facets / counts | `/facets` | `catalog.py::facets` |
| Browse | `/browse` | `catalog.py::browse` |

## Frontend pages
| Route | File |
|---|---|
| Landing | `frontend/app/page.tsx` |
| Sign in / up | `frontend/app/signin/page.tsx` |
| 2FA setup/verify + backup codes | `frontend/app/twofa/page.tsx` |
| Search (slider, toggles, filters, live metrics, feedback) | `frontend/app/search/page.tsx` |
| Product detail + similar | `frontend/app/product/[sku]/page.tsx` |
| Account (favorites/recent/saved) | `frontend/app/account/page.tsx` |
| Admin analytics | `frontend/app/admin/page.tsx` |
