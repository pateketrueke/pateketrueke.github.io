# defaults
src := build
from := develop
target := master
message := Release: $(shell date)

GIT_REVISION=$(shell git rev-parse --short=7 HEAD)

export GIT_REVISION

define iif
  @(($(1) > /dev/null 2>&1) && echo "$(2)") || echo "$(3)"
endef

help: Makefile
	@awk -F':.*?##' '/^[a-z\\%!:-]+:.*##/{gsub("%","*",$$1);gsub("\\\\",":*",$$1);printf "\033[36m%8s\033[0m %s\n",$$1,$$2}' $<

dev: deps ## Lift dev environment for this service
	@npm run dev

dist: deps ## Build artifact for production
	@(git worktree remove $(src) --force > /dev/null 2>&1) || true
	@git worktree add $(src) $(target)
	@npm run dist

clean: ## Remove all generated sources
	@$(call iif,rm -r $(src),Built artifacts were deleted,Artifacts already deleted)

prune: ## Remove cache file to recompile
	@$(call iif,unlink .tarima,Cache file was deleted,Cache file already deleted)

deploy: $(src) ## Push generated files to gh-pages
	@cd $(src) && git add --all && git commit -m "$(message)"
	@git push origin $(target) -f

# Ensure dependencies are installed before
.PHONY: help deps dev dist clean prune deploy
deps:
	@(((ls $(PWD)/node_modules | grep .) > /dev/null 2>&1) || npm i) || true
