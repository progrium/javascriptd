.PHONY: dev build push

dev: build
	@docker rm -f javascriptd-dev || true
	docker run -it --name javascriptd-dev --publish 8000:8000 progrium/javascriptd

test:
	npm test

build:
	docker build -t progrium/javascriptd .

push: build
	docker push progrium/javascriptd
