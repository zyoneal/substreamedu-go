.PHONY: build test lint clean docker-up docker-down

GO_SERVICES = substreamedu-iam-service-go substreamedu-dictionary-service-go substreamedu-media-service-go substreamedu-notification-service-go substreamedu-gateway-go

build:
	@for dir in $(GO_SERVICES); do \
		echo "Building $$dir..."; \
		cd $$dir && go build -ldflags="-w -s" ./... && cd ..; \
	done

test:
	@for dir in $(GO_SERVICES); do \
		echo "Testing $$dir..."; \
		cd $$dir && go test -v -race -count=1 ./... && cd ..; \
	done

lint:
	golangci-lint run ./...

vet:
	@for dir in $(GO_SERVICES); do \
		echo "Vetting $$dir..."; \
		cd $$dir && go vet ./... && cd ..; \
	done

clean:
	@for dir in $(GO_SERVICES); do \
		rm -f $$dir/server $$dir/gateway; \
	done

docker-up:
	docker compose up -d --build

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f --tail=100
