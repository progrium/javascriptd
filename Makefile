.PHONY: dev build push

dev: build
	@docker rm -f runkit-dev || true
	docker run -it --name runkit-dev --publish 8000:8000 progrium/runkit

build:
	docker build -t progrium/runkit .

push: build
	docker push progrium/runkit

publish:
	npm publish
