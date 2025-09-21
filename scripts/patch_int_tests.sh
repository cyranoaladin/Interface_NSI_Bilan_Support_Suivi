#!/bin/bash
set -e

echo "🚀 Patch des tests d'intégration API..."

ROOT_DIR="$(dirname "$(realpath "$0")")/.."
WEB_DIR="$ROOT_DIR/apps/web"

# 1. Ajouter jest.int.config.js
cat > "$WEB_DIR/jest.int.config.js" <<'EOF'
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest"
  },
  moduleFileExtensions: ["ts", "tsx", "js", "json"],
  testMatch: ["**/*.int.test.ts"],
  extensionsToTreatAsEsm: [".ts"],
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.json",
      useESM: true
    }
  }
};
EOF

# 2. Ajouter script test:int si absent
if ! grep -q '"test:int"' "$WEB_DIR/package.json"; then
  sed -i 's/"test":/"test:int": "NODE_OPTIONS=--experimental-vm-modules jest -c jest.int.config.js",\n    "test":/' "$WEB_DIR/package.json"
fi

echo "✅ Patch terminé. Lancez :"
echo "cd $WEB_DIR && npm install && npm run test:int"
