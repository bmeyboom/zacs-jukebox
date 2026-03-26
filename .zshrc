# 1. Tell the shell where Homebrew lives
export PATH="/opt/homebrew/bin:$PATH"

# 2. Initialize fnm (using the path we just added)
eval "$(fnm env --use-on-cd)"
