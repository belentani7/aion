#!/usr/bin/env bash
# Dependency Audit Script — ADR-0012 Compliance
# Runs the same audit gates as CI locally

set -euo pipefail

echo "=========================================="
echo "AION Dependency Audit — ADR-0012"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

audit_prod() {
    echo -e "${YELLOW}[1/2] Production Audit (--omit=dev) — MUST PASS${NC}"
    if pnpm audit --omit=dev --audit-level=high; then
        echo -e "${GREEN}✓ Production audit PASSED${NC}"
        return 0
    else
        echo -e "${RED}✗ Production audit FAILED${NC}"
        return 1
    fi
}

audit_dev() {
    echo -e "${YELLOW}[2/2] Dev Audit (documented exceptions)${NC}"
    # Capture output to analyze
    output=$(pnpm audit --audit-level=high 2>&1 || true)
    echo "$output"
    
    # Check for unexpected vulnerabilities (not in documented exceptions)
    # Expected: 0 vulnerabilities (AION has no electron-builder chain)
    vuln_count=$(echo "$output" | grep -E "^\s+\d+\s+(critical|high|moderate|low)" | awk '{sum+=$1} END {print sum}')
    
    if [ -z "$vuln_count" ] || [ "$vuln_count" -eq 0 ]; then
        echo -e "${GREEN}✓ Dev audit PASSED (0 vulnerabilities)${NC}"
        return 0
    else
        echo -e "${RED}✗ Dev audit found $vuln_count unexpected vulnerabilities${NC}"
        echo "Review ADR-0012 — unexpected findings in dev dependencies"
        return 1
    fi
}

main() {
    echo "Starting dependency audit..."
    echo ""
    
    local failed=0
    
    audit_prod || failed=1
    echo ""
    audit_dev || failed=1
    echo ""
    
    echo "=========================================="
    if [ $failed -eq 0 ]; then
        echo -e "${GREEN}ALL AUDITS PASSED${NC}"
        exit 0
    else
        echo -e "${RED}AUDIT FAILURES DETECTED${NC}"
        exit 1
    fi
}

main "$@"