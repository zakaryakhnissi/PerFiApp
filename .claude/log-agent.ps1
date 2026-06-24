$d = $input | ConvertFrom-Json
$agent = if ($d.subagent_type) { $d.subagent_type } else { 'agent' }
$desc  = if ($d.description)   { $d.description }   else { '—' }
Add-Content -Path ".claude/agent-log.txt" -Value "$(Get-Date -Format 'HH:mm') | $agent | $desc"
