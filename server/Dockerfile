FROM golang:1.20-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o awesomeChat ./main.go

FROM alpine:latest

RUN apk add --no-cache graphviz

COPY --from=builder /app/awesomeChat .
COPY ./config/ ./config/

EXPOSE 8080

CMD ["./awesomeChat"]
