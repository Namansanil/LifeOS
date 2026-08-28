# LifeOS Git Branching & Release Pipeline

To maintain production stability, data integrity, and strict quality control, LifeOS follows the **Feature $\rightarrow$ Develop $\rightarrow$ Release/Testing $\rightarrow$ Main** promotion model.

```
feature/* (New Features / Bug Fixes)
    │
    ▼ (PR / Merge)
develop (Integration Branch)
    │
    ▼ (Promote Release Candidate)
release/testing (QA & Native Device Validation)
    │
    ▼ (Production Release)
main (Production Stable)
```

---

## 1. Branch Hierarchy

| Branch | Purpose | Protection |
|---|---|---|
| `feature/*` | Active development of specific modules (e.g. `feature/ble-sensors`, `feature/surf-tides`) | Ephemeral (deleted after merge) |
| `develop` | Integration branch where tested features converge | Persistent |
| `release/testing` | Release Candidate branch for QA, native GPS testing, and staging validation | Persistent |
| `main` | Production-ready code deployed to end users and stores | Protected & Tagged |

---

## 2. Standard Workflow & Commands

### Step 1: Create a Feature Branch from `develop`
```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```
- Write code, add unit tests, and commit:
```bash
git commit -m "feat(module): your concise commit message"
```

---

### Step 2: Merge Feature into `develop`
- Verify tests and TypeScript before merging:
```bash
npm run typecheck && npm test
git checkout develop
git pull origin develop
git merge feature/your-feature-name
git push origin develop
```

---

### Step 3: Promote to `release/testing` for QA
- When a set of features is ready for staging testing:
```bash
git checkout release/testing
git pull origin release/testing
git merge develop
npm run typecheck && npm test
git push origin release/testing
```
- Conduct physical iOS and Android device verification (GPS tracking, background tasks, battery).

---

### Step 4: Promote to `main` for Production Release
- Once testing passes without regressions:
```bash
git checkout main
git pull origin main
git merge release/testing
git tag -a v1.0.1 -m "Release v1.0.1"
git push origin main --tags
```

---

### Step 5: Sync Back to `develop`
- Keep `develop` aligned with any hotfixes or release adjustments:
```bash
git checkout develop
git merge main
git push origin develop
```
