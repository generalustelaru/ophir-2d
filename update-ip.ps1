$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -like '*Ethernet*'}).IPAddress | Select-Object -First 1
$content = Get-Content .env -ErrorAction SilentlyContinue
$content = $content | Where-Object {$_ -notmatch '^SERVER_ADDRESS='}
$content += "SERVER_ADDRESS=$ip"
$content | Set-Content .env