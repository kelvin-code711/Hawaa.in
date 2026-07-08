# Fixes local development on this machine: the ISP blocks the default IPs of
# several Google/Firebase API hosts (connections time out on both IPv4/IPv6),
# which breaks Firebase Auth in the browser and the Firebase CLI.
# All *.googleapis.com services are served from shared Google frontends, so
# pointing the blocked hosts at a reachable frontend IP restores access.
#
# Run as Administrator:  powershell -ExecutionPolicy Bypass -File scripts\fix-firebase-network.ps1
# To undo:               powershell -ExecutionPolicy Bypass -File scripts\fix-firebase-network.ps1 -Revert
#
# NOTE: If Firebase stops working again later, the pinned IP may have gone
# stale. Re-run with -Revert, find a new working IP with:
#   nslookup www.googleapis.com   (then test: curl https://firebase.googleapis.com/ --resolve firebase.googleapis.com:443:<IP>)
# and update $GoodIp below.

param([switch]$Revert)

$GoodIp = "74.125.200.95"
$Hosts = @(
    "firebase.googleapis.com",
    "identitytoolkit.googleapis.com",
    "securetoken.googleapis.com",
    "firebasehosting.googleapis.com",
    "serviceusage.googleapis.com",
    "firebaserules.googleapis.com"
)
$Marker = "# hawaa-firebase-network-fix"
$HostsFile = "$env:SystemRoot\System32\drivers\etc\hosts"

$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "Please run this script as Administrator."
    exit 1
}

$content = Get-Content $HostsFile | Where-Object { $_ -notmatch [regex]::Escape($Marker) }

if ($Revert) {
    $content | Set-Content $HostsFile -Encoding ascii
    Write-Host "Removed Firebase network-fix entries from hosts file."
} else {
    $lines = $Hosts | ForEach-Object { "$GoodIp $_ $Marker" }
    ($content + $lines) | Set-Content $HostsFile -Encoding ascii
    Write-Host "Added $($Hosts.Count) hosts entries pointing to $GoodIp."
    Write-Host "Flush DNS with: ipconfig /flushdns (done automatically now)"
    ipconfig /flushdns | Out-Null
}
