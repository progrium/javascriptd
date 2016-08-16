.PHONY: dev build push

dev:
	docker build -t progrium/runkit .
	@docker rm -f runkit-dev || true
	docker run -it --name runkit-dev --publish 8000:8000 progrium/runkit

build:
	docker build -t progrium/runkit .

push:
	docker push progrium/runkit
