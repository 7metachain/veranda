# Veranda — cross-language task runner
# https://github.com/casey/just

default: dev

# Bring up the full local dev stack (ROS sim + backend + frontend)
dev:
    docker compose -f ros-sim/docker-compose.yml up -d
    cargo run -p backend &
    pnpm --filter frontend dev

# Build everything that ships
build:
    cargo build --release --workspace
    anchor build
    pnpm --filter frontend build

# Run all test suites
test:
    cargo test --workspace
    anchor test
    pnpm --filter frontend test

# Compilation gates (acceptance criteria §12)
check:
    cargo check --workspace
    anchor build
    pnpm --filter frontend build

# Deploy escrow + rollup programs to devnet, init treasury
deploy-devnet:
    bash scripts/deploy_devnet.sh

# Walk through the canonical happy path end-to-end against devnet
demo:
    bash scripts/run_demo.sh

# Seed mock data (3 demo users + 30k pool of mock agents)
seed:
    pnpm tsx scripts/seed_demo_data.ts

# Tear down docker stack
down:
    docker compose -f ros-sim/docker-compose.yml down

# Compile circom circuits + run trusted setup
circuits:
    bash circuits/scripts/compile.sh
    bash circuits/scripts/trusted_setup.sh

# Format everything
fmt:
    cargo fmt --all
    pnpm --filter frontend exec prettier --write src

# Lint
lint:
    cargo clippy --workspace -- -D warnings
    pnpm --filter frontend exec next lint
