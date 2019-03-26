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
	@npm run dist

clean: ## Remove all from node_modules/*
	@((rm -r build > /dev/null 2>&1) && echo "Built artifacts were deleted") || echo "Artifacts already deleted"
	@((unlink .tarima > /dev/null 2>&1) && echo "Cache file was deleted") || echo "Cache file already deleted"

deploy: build ## Publish to production
	@(git branch -D $(target) || true) > /dev/null 2>&1
	@git checkout --orphan $(target)
	@git rm -r --cached . > /dev/null 2>&1
	@cat exclude.txt >> .gitignore
	@cp -r build/* .
	@git add . && git commit -m "$(message)"
	@git push origin $(target) -f
	@git checkout $(from)

# Ensure dependencies are installed before
.PHONY: help dev dist clean deploy dependencies
deps:
	@(((ls $(PWD)/node_modules | grep .) > /dev/null 2>&1) || npm i) || true
