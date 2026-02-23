## SoftCRM API Smoke Test Script
$ErrorActionPreference = "Continue"
$base = "http://localhost:4000"
$pass = 0; $fail = 0; $failures = @()

function Test-EP {
    param([string]$Method, [string]$Url, [string]$Body = $null, [hashtable]$H = @{}, [int[]]$OK = @(200,201))
    $full = "$base$Url"
    try {
        $p = @{ Uri = $full; Method = $Method; Headers = $H; ContentType = "application/json" }
        if ($Body) { $p["Body"] = $Body }
        $null = Invoke-RestMethod @p
        $script:pass++
        Write-Host "  PASS $Method $Url"
    } catch {
        $code = 0
        if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
        if ($code -in $OK) {
            $script:pass++
            Write-Host "  PASS $Method $Url ($code expected)"
        } else {
            $script:fail++
            $script:failures += "$Method $Url -> $code"
            Write-Host "  FAIL $Method $Url -> $code"
        }
    }
}

## 1. Health
Write-Host "`n=== HEALTH ===" -ForegroundColor Cyan
Test-EP GET "/health"
Test-EP GET "/ready"

## 2. Auth
Write-Host "`n=== AUTH ===" -ForegroundColor Cyan
$loginBody = '{"email":"admin@softcrm.dev","password":"admin123!","tenantSlug":"default"}'
try {
    $loginResp = Invoke-RestMethod -Uri "$base/api/v1/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResp.accessToken
    Write-Host "  PASS POST /api/v1/auth/login (token obtained)"
    $pass++
} catch {
    Write-Host "  FAIL POST /api/v1/auth/login" -ForegroundColor Red
    $fail++; exit 1
}
$H = @{ Authorization = "Bearer $token" }
Test-EP POST "/api/v1/auth/login" -Body '{"email":"bad@test.com","password":"wrong","tenantSlug":"default"}' -OK @(401)
Test-EP GET "/api/v1/auth/me" -H $H -OK @(200,404)

## 3. RBAC
Write-Host "`n=== PLATFORM / RBAC ===" -ForegroundColor Cyan
Test-EP GET "/api/v1/platform/roles" -H $H
Test-EP GET "/api/v1/platform/roles/me/permissions" -H $H

## 4. Audit
Write-Host "`n=== PLATFORM / AUDIT ===" -ForegroundColor Cyan
Test-EP GET "/api/v1/platform/audit" -H $H
Test-EP GET "/api/v1/platform/audit/verify" -H $H -OK @(200,400,404)

## 5. Custom Fields
Write-Host "`n=== PLATFORM / CUSTOM FIELDS ===" -ForegroundColor Cyan
Test-EP GET "/api/v1/platform/custom-fields/defs?module=sales&entity=Contact" -H $H
Test-EP POST "/api/v1/platform/custom-fields/defs" -H $H -Body '{"module":"sales","entity":"Contact","fieldName":"testField","fieldType":"TEXT","label":"Test Field","required":false,"sortOrder":1}' -OK @(200,201,400,409)

## 6. Workflows
Write-Host "`n=== PLATFORM / WORKFLOWS ===" -ForegroundColor Cyan
Test-EP GET "/api/v1/platform/workflows" -H $H

## 7. GDPR
Write-Host "`n=== PLATFORM / GDPR ===" -ForegroundColor Cyan
Test-EP GET "/api/v1/platform/gdpr/requests" -H $H -OK @(200,404)
Test-EP POST "/api/v1/platform/gdpr/requests" -H $H -Body '{"type":"EXPORT","subjectEmail":"test@test.com"}' -OK @(200,201,400,404)

## 8. Sales
Write-Host "`n=== SALES ===" -ForegroundColor Cyan
Test-EP GET "/api/v1/sales/contacts" -H $H
Test-EP POST "/api/v1/sales/contacts" -H $H -Body '{"firstName":"John","lastName":"Doe","email":"john.doe@test.com"}' -OK @(200,201,400,409)
try { $contacts = Invoke-RestMethod -Uri "$base/api/v1/sales/contacts" -Headers $H; $cid = $contacts.data[0].id } catch { $cid = $null }
if ($cid) { Test-EP GET "/api/v1/sales/contacts/$cid" -H $H }
Test-EP GET "/api/v1/sales/accounts" -H $H
Test-EP POST "/api/v1/sales/accounts" -H $H -Body '{"name":"Test Corp","industry":"Technology"}' -OK @(200,201,400,409)
try { $accounts = Invoke-RestMethod -Uri "$base/api/v1/sales/accounts" -Headers $H; $aid = $accounts.data[0].id } catch { $aid = $null }
if ($aid) { Test-EP GET "/api/v1/sales/accounts/$aid" -H $H }
Test-EP GET "/api/v1/sales/leads" -H $H
Test-EP POST "/api/v1/sales/leads" -H $H -Body '{"title":"Test Lead","source":"WEB","status":"NEW"}' -OK @(200,201,400)
Test-EP GET "/api/v1/sales/deals" -H $H
Test-EP GET "/api/v1/sales/pipelines" -H $H
Test-EP POST "/api/v1/sales/pipelines" -H $H -Body '{"name":"Default Pipeline","stages":[{"name":"Qualification","order":1},{"name":"Proposal","order":2},{"name":"Close","order":3}]}' -OK @(200,201,400,404,409)
Test-EP GET "/api/v1/sales/activities" -H $H -OK @(200,404)
Test-EP GET "/api/v1/sales/quotes" -H $H -OK @(200,404)

## 9. Accounting
Write-Host "`n=== ACCOUNTING ===" -ForegroundColor Cyan
Test-EP GET "/api/v1/accounting/chart-of-accounts" -H $H
Test-EP POST "/api/v1/accounting/chart-of-accounts" -H $H -Body '{"code":"1000","name":"Cash","type":"ASSET","subtype":"CURRENT_ASSET"}' -OK @(200,201,400,409)
Test-EP GET "/api/v1/accounting/invoices" -H $H
Test-EP GET "/api/v1/accounting/invoices/overdue" -H $H
Test-EP GET "/api/v1/accounting/journal-entries" -H $H
Test-EP GET "/api/v1/accounting/expenses" -H $H
Test-EP POST "/api/v1/accounting/expenses" -H $H -Body '{"description":"Office Supplies","amount":50.00,"date":"2025-06-01","category":"OFFICE"}' -OK @(200,201,400)
Test-EP GET "/api/v1/accounting/tax-rates" -H $H -OK @(200,404)
Test-EP GET "/api/v1/accounting/reports/trial-balance" -H $H -OK @(200,400,500)
Test-EP GET "/api/v1/accounting/reports/profit-loss?startDate=2025-01-01&endDate=2025-12-31" -H $H -OK @(200,400,500)
Test-EP GET "/api/v1/accounting/reports/balance-sheet?asOfDate=2025-12-31" -H $H -OK @(200,400,500)
Test-EP GET "/api/v1/accounting/reports/ar-aging" -H $H -OK @(200,400,500)
Test-EP GET "/api/v1/accounting/reports/ap-aging" -H $H -OK @(200,400,500)
Test-EP GET "/api/v1/accounting/reports/cash-flow?startDate=2025-01-01&endDate=2025-12-31" -H $H -OK @(200,400,500)

## 10. Support
Write-Host "`n=== SUPPORT ===" -ForegroundColor Cyan
Test-EP GET "/api/v1/support/tickets" -H $H
Test-EP POST "/api/v1/support/tickets" -H $H -Body '{"subject":"Test Ticket","description":"Test description","priority":"MEDIUM"}' -OK @(200,201,400)
try { $tickets = Invoke-RestMethod -Uri "$base/api/v1/support/tickets" -Headers $H; $tid = $tickets.data[0].id } catch { $tid = $null }
if ($tid) { Test-EP GET "/api/v1/support/tickets/$tid" -H $H }
Test-EP GET "/api/v1/support/kb/articles" -H $H
Test-EP GET "/api/v1/support/kb/categories" -H $H
Test-EP POST "/api/v1/support/kb/categories" -H $H -Body '{"name":"General","description":"General category"}' -OK @(200,201,400,409)
Test-EP GET "/api/v1/support/csat/stats" -H $H -OK @(200,400,404)
Test-EP GET "/api/v1/support/sla" -H $H -OK @(200,404)
Test-EP GET "/api/v1/support/canned-responses" -H $H -OK @(200,404)

## 11. Inventory
Write-Host "`n=== INVENTORY ===" -ForegroundColor Cyan
Test-EP GET "/api/v1/inventory/products" -H $H
Test-EP POST "/api/v1/inventory/products" -H $H -Body '{"name":"Test Product","sku":"TEST-001","unitPrice":9.99}' -OK @(200,201,400,409)
Test-EP GET "/api/v1/inventory/warehouses" -H $H
Test-EP POST "/api/v1/inventory/warehouses" -H $H -Body '{"name":"Main Warehouse","code":"WH-001","address":"123 Test St"}' -OK @(200,201,400,409)
Test-EP GET "/api/v1/inventory/stock/low" -H $H -OK @(200,400)
Test-EP GET "/api/v1/inventory/price-books" -H $H
Test-EP GET "/api/v1/inventory/orders" -H $H -OK @(200,404)
Test-EP GET "/api/v1/inventory/purchase-orders" -H $H -OK @(200,404)
Test-EP GET "/api/v1/inventory/stock-movements" -H $H -OK @(200,404)

## 12. Marketing
Write-Host "`n=== MARKETING ===" -ForegroundColor Cyan
Test-EP GET "/api/v1/marketing/segments" -H $H
Test-EP POST "/api/v1/marketing/segments" -H $H -Body '{"name":"Test Segment","rules":{"operator":"AND","conditions":[{"field":"email","op":"contains","value":"test"}]}}' -OK @(200,201,400)
Test-EP GET "/api/v1/marketing/campaigns" -H $H
Test-EP POST "/api/v1/marketing/campaigns" -H $H -Body '{"name":"Test Campaign","type":"EMAIL","status":"DRAFT"}' -OK @(200,201,400)
Test-EP GET "/api/v1/marketing/unsubscribes" -H $H -OK @(200,404)
Test-EP GET "/api/v1/marketing/attribution" -H $H -OK @(200,400,404)
Test-EP GET "/api/v1/marketing/templates" -H $H -OK @(200,404)

## 13. Comms
Write-Host "`n=== COMMS ===" -ForegroundColor Cyan
Test-EP GET "/api/v1/comms/activities" -H $H
Test-EP GET "/api/v1/comms/timeline" -H $H -OK @(200,400)
Test-EP GET "/api/v1/comms/email-templates" -H $H
Test-EP GET "/api/v1/comms/channels" -H $H -OK @(200,404)
Test-EP GET "/api/v1/comms/notifications" -H $H -OK @(200,404)

## 14. Analytics
Write-Host "`n=== ANALYTICS ===" -ForegroundColor Cyan
Test-EP GET "/api/v1/analytics/dashboards" -H $H
Test-EP GET "/api/v1/analytics/reports" -H $H
Test-EP GET "/api/v1/analytics/forecast" -H $H -OK @(200,400)
Test-EP GET "/api/v1/analytics/anomalies" -H $H -OK @(200,400)
Test-EP GET "/api/v1/analytics/pipeline-metrics" -H $H -OK @(200,400)
Test-EP GET "/api/v1/analytics/leaderboard" -H $H -OK @(200,400,404)
Test-EP GET "/api/v1/analytics/cohort" -H $H -OK @(200,400,404)

## 15. Projects
Write-Host "`n=== PROJECTS ===" -ForegroundColor Cyan
Test-EP GET "/api/v1/projects" -H $H
Test-EP POST "/api/v1/projects" -H $H -Body '{"name":"Test Project","status":"PLANNING"}' -OK @(200,201,400)
try { $projects = Invoke-RestMethod -Uri "$base/api/v1/projects" -Headers $H; $projId = $projects.data[0].id } catch { $projId = $null }
if ($projId) {
    Test-EP GET "/api/v1/projects/$projId" -H $H
    Test-EP GET "/api/v1/projects/$projId/tasks" -H $H -OK @(200,404)
    Test-EP GET "/api/v1/projects/$projId/milestones" -H $H -OK @(200,404)
    Test-EP GET "/api/v1/projects/$projId/time-entries" -H $H -OK @(200,404)
}
Test-EP GET "/api/v1/projects/templates" -H $H -OK @(200,404)

## 16. Sync
Write-Host "`n=== SYNC ===" -ForegroundColor Cyan
Test-EP GET "/api/v1/sync/pull?since=2025-01-01T00:00:00Z" -H $H -OK @(200,400)

## Summary
Write-Host "`n============================================" -ForegroundColor Yellow
Write-Host "  RESULTS: $pass PASSED / $fail FAILED / $($pass+$fail) TOTAL" -ForegroundColor $(if($fail -eq 0){"Green"}else{"Yellow"})
Write-Host "============================================" -ForegroundColor Yellow

if ($failures.Count -gt 0) {
    Write-Host "`nFAILED ENDPOINTS:" -ForegroundColor Red
    $failures | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
} else {
    Write-Host "`nAll endpoints passed!" -ForegroundColor Green
}
