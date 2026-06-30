# Push Workflow

Use this workflow before pushing SupplyDesk changes to GitHub.

## 1. Inspect changes

```bash
cd /opt/talabati
git status
git diff
```

## 2. Verify the app

```bash
npm test
npm run build
```

If the live service is changed, restart and verify health:

```bash
pm2 restart talabati --update-env
curl -fsS http://127.0.0.1:3000/api/health
```

## 3. Scan for files that must not be tracked

```bash
git ls-files | grep -E '(^|/)(node_modules|dist|secrets|data|backups)(/|$)|\.env|\.sqlite$|\.dump$|\.tar(\.gz)?$' || true
```

If this prints anything sensitive or runtime-generated, stop and fix `.gitignore` or untrack the file before committing.

## 4. Commit with a clear message

Good examples:

```text
docs: refresh SupplyDesk repository presentation
feat: add budget line management
fix: translate budget dashboard labels
```

Avoid generic messages such as:

```text
update
changes
fix
```

## 5. Push and verify

```bash
git push
```

After pushing, read back the remote commit and repository page when possible.

## Final report format

```text
Done ✅

Commit:
<sha> <message>

Changed:
- ...
- ...

Verified:
- npm test ✅
- npm run build ✅
- tracked-file safety scan ✅
```
