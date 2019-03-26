# defaults
src := build
from := develop
target := gh-pages
message := Release: $(shell date)

help: Makefile
	@awk -F':.*?##' '/^[a-z\\%!:-]+:.*##/{gsub("%","*",$$1);gsub("\\\\",":*",$$1);printf "\033[36m%8s\033[0m %s\n",$$1,$$2}' $<

dev: deps ## Lift dev environment for this service
	@npm run dev

dist: deps ## Build artifact for production
	@(git worktree remove $(src) --force > /dev/null 2>&1) || true
	@git worktree add $(src) $(target)
	@npm run dist

clean: ## Remove all from node_modules/*
	@((rm -r $(src) > /dev/null 2>&1) && echo "Built artifacts were deleted") || echo "Artifacts already deleted"
	@((unlink .tarima > /dev/null 2>&1) && echo "Cache file was deleted") || echo "Cache file already deleted"

deploy: $(src)
	@cd $(src) && git add --all && git commit -m "$(message)"
	@git push origin $(target) -f

# Ensure dependencies are installed before
.PHONY: help deps dev dist clean deploy
deps:
	@(((ls $(PWD)/node_modules | grep .) > /dev/null 2>&1) || npm i) || true
