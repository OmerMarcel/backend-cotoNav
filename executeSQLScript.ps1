# Script PowerShell pour exécuter le SQL via psql
# Demande d'abord le mot de passe Supabase PostgreSQL

Write-Host "🔐 Correction des arrondissements de Cotonou" -ForegroundColor Cyan

# Configuration Supabase
$host = "phcwxylbnfajzvucnvuh.supabase.co"
$port = "5432"
$database = "postgres"
$username = "postgres"

Write-Host "`n📝 Veuillez entrer votre mot de passe Supabase PostgreSQL:" -ForegroundColor Yellow
$securePassword = Read-Host -AsSecureString
$password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($securePassword))

Write-Host "`n🔄 Exécution du script SQL..." -ForegroundColor Cyan

# Crée un fichier .pgpass temporaire pour les credentials
$pgpassDir = "$env:APPDATA\postgresql"
$pgpassFile = "$pgpassDir\pgpass.conf"

# Crée le répertoire s'il n'existe pas
if (!(Test-Path $pgpassDir)) {
    New-Item -ItemType Directory -Path $pgpassDir -Force | Out-Null
}

# Ajoute les credentials (format: hostname:port:database:username:password)
$pgpassEntry = "$host`:$port`:$database`:$username`:$password"
Add-Content -Path $pgpassFile -Value $pgpassEntry -Force

# Change les permissions du fichier (doit être readable uniquement par le propriétaire)
icacls $pgpassFile /inheritance:r /grant:r "$env:USERNAME`:(F)" | Out-Null

# Exécute le script SQL
$sqlFile = Join-Path $PSScriptRoot ".." "fixCotonou.sql"

if (!(Test-Path $sqlFile)) {
    Write-Host "`n❌ Fichier SQL non trouvé: $sqlFile" -ForegroundColor Red
    exit 1
}

Write-Host "`n📄 Fichier SQL: $sqlFile" -ForegroundColor Green
Write-Host "🗄️  Base de données: $database@$host" -ForegroundColor Green

# Exécute psql
& psql --host=$host --port=$port --username=$username --dbname=$database -f $sqlFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Script exécuté avec succès!" -ForegroundColor Green
    Write-Host "`n🎉 Les 12 arrondissements de Cotonou ont été réimportés avec les bonnes coordonnées." -ForegroundColor Green
    Write-Host "`n💡 Test: curl `"http://localhost:5000/api/administrative-location?latitude=6.3654&longitude=2.4183`"" -ForegroundColor Yellow
} else {
    Write-Host "`n❌ Erreur lors de l'exécution du script" -ForegroundColor Red
}

# Nettoie le fichier de credentials
Remove-Item -Path $pgpassFile -Force -ErrorAction SilentlyContinue | Out-Null

Write-Host "`n✓ Processus terminé" -ForegroundColor Green
