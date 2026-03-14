# Pushing to GitHub (main and testing)

## One-time setup

1. **Authentication** (choose one):
   - **HTTPS:** Create a [Personal Access Token](https://github.com/settings/tokens) and use it as the password when Git prompts. To cache it: `git config --global credential.helper store`
   - **SSH:** [Add your SSH key to GitHub](https://docs.github.com/en/authentication/connecting-to-github-with-ssh), then:
     ```bash
     git remote set-url origin git@github.com:dpastoetter/OpenInk-WebOS.git
     ```

2. **Optional – track main:** So `git push` works when on main:
   ```bash
   git branch --set-upstream-to=origin/main main
   git branch --set-upstream-to=origin/testing testing
   ```

## Push testing and main

From the repo root, run:

```bash
./scripts/push-to-github.sh
```

Or do it manually:

```bash
git push origin testing
git checkout main
git merge testing -m "Merge branch 'testing' into main"
git push origin main
git checkout testing
```

## Push only one branch

- Testing only: `git push origin testing`
- Main only: `git push origin main` (when on main and up to date)
