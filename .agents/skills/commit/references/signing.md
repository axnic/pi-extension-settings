# Cryptographic Signing

Every commit must be cryptographically signed (SSH or GPG) so that authorship
can be verified independently of the DCO sign-off.

## GPG

```sh
git commit -S -s -m "..."
```

Configure `user.signingkey` in `.gitconfig` with your GPG key ID.

## SSH

```sh
git config gpg.format ssh
git config user.signingkey /path/to/key.pub
git commit -S -s -m "..."
```

## Sign all commits automatically

```sh
git config --global commit.gpgsign true
```

## Verify a commit

```sh
git log --show-signature
git verify-commit <sha>
```
