import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/tools/copy-button";

// Gitignore templates — curated, no API needed
const TEMPLATES: Record<string, string> = {
  Node: `# Node.js
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
.pnpm-store/
.npm
.yarn/cache
.yarn/unplugged
.yarn/build-state.yml
.yarn/install-state.gz
dist/
build/
.cache/
*.tsbuildinfo
.env
.env.local
.env.*.local
`,
  Python: `# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg
.venv/
venv/
ENV/
env/
.env
*.pyc
.pytest_cache/
.mypy_cache/
.ruff_cache/
htmlcov/
.coverage
.coverage.*
`,
  Rust: `# Rust
/target/
Cargo.lock
**/*.rs.bk
*.pdb
`,
  Go: `# Go
*.exe
*.exe~
*.dll
*.so
*.dylib
*.test
*.out
vendor/
go.sum
`,
  Java: `# Java / Maven / Gradle
*.class
*.log
*.jar
*.war
*.nar
*.ear
*.zip
*.tar.gz
*.rar
target/
build/
.gradle/
.idea/
*.iml
*.iws
*.ipr
out/
.classpath
.project
.settings/
`,
  "C/C++": `# C / C++
*.d
*.slo
*.lo
*.o
*.obj
*.gch
*.pch
*.so
*.dylib
*.dll
*.mod
*.smod
*.lai
*.la
*.a
*.lib
*.exe
*.out
*.app
build/
cmake-build-*/
CMakeFiles/
CMakeCache.txt
`,
  macOS: `# macOS
.DS_Store
.AppleDouble
.LSOverride
._*
.DocumentRevisions-V100
.fseventsd
.Spotlight-V100
.TemporaryItems
.Trashes
.VolumeIcon.icns
.com.apple.timemachine.donotpresent
.AppleDB
.AppleDesktop
Network Trash Folder
Temporary Items
.apdisk
`,
  Windows: `# Windows
Thumbs.db
Thumbs.db:encryptable
ehthumbs.db
ehthumbs_vista.db
*.stackdump
[Dd]esktop.ini
$RECYCLE.BIN/
*.cab
*.msi
*.msix
*.msm
*.msp
*.lnk
`,
  Linux: `# Linux
*~
.fuse_hidden*
.directory
.Trash-*
.nfs*
`,
  VSCode: `# VS Code
.vscode/*
!.vscode/settings.json
!.vscode/tasks.json
!.vscode/launch.json
!.vscode/extensions.json
!.vscode/*.code-snippets
.history/
*.vsix
`,
  JetBrains: `# JetBrains IDEs
.idea/
*.iml
*.iws
*.ipr
out/
.idea_modules/
atlassian-ide-plugin.xml
com_crashlytics_export_strings.xml
crashlytics.properties
crashlytics-build.properties
fabric.properties
`,
  Docker: `# Docker
.dockerignore
docker-compose.override.yml
`,
  Terraform: `# Terraform
.terraform/
.terraform.lock.hcl
*.tfstate
*.tfstate.*
*.tfvars
crash.log
crash.*.log
override.tf
override.tf.json
*_override.tf
*_override.tf.json
`,
  "Next.js": `# Next.js
.next/
out/
build/
.vercel
*.tsbuildinfo
next-env.d.ts
`,
  "React / Vite": `# React / Vite
node_modules/
dist/
dist-ssr/
*.local
.env
.env.local
.env.*.local
`,
  Laravel: `# Laravel
/vendor/
/node_modules/
/public/hot
/public/storage
/storage/*.key
.env
.env.backup
.env.production
.phpunit.result.cache
Homestead.json
Homestead.yaml
auth.json
npm-debug.log
yarn-error.log
/.fleet
/.idea
/.vscode
`,
  Django: `# Django
*.log
*.pot
*.pyc
__pycache__/
local_settings.py
db.sqlite3
db.sqlite3-journal
media/
staticfiles/
.env
`,
  "Ruby on Rails": `# Ruby on Rails
*.rbc
capybara-*.html
.rspec
/db/*.sqlite3
/db/*.sqlite3-journal
/db/*.sqlite3-shm
/db/*.sqlite3-wal
/public/system
/coverage/
/spec/tmp
*.orig
rerun.txt
pickle-email-*.html
config/initializers/secret_token.rb
config/master.key
.env
/log/*
/tmp/*
`,
};

const GROUPS: { label: string; items: string[] }[] = [
  { label: "Languages", items: ["Node", "Python", "Rust", "Go", "Java", "C/C++", "Ruby on Rails"] },
  { label: "Frameworks", items: ["Next.js", "React / Vite", "Django", "Laravel"] },
  { label: "OS / IDE", items: ["macOS", "Windows", "Linux", "VSCode", "JetBrains"] },
  { label: "DevOps", items: ["Docker", "Terraform"] },
];

export default function GitignoreGeneratorTool() {
  const [selected, setSelected] = useState<Set<string>>(new Set(["Node", "macOS", "VSCode"]));

  function toggle(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  const output = useMemo(() => {
    if (selected.size === 0) return "";
    return [...selected]
      .filter((k) => TEMPLATES[k])
      .map((k) => TEMPLATES[k])
      .join("\n");
  }, [selected]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        {GROUPS.map((group) => (
          <div key={group.label} className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {group.label}
            </span>
            <div className="flex flex-wrap gap-2">
              {group.items.map((name) => {
                const active = selected.has(name);
                return (
                  <button
                    key={name}
                    onClick={() => toggle(name)}
                    className={`rounded-full px-3 py-1 text-sm font-medium transition-colors border ${
                      active
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "bg-muted text-muted-foreground border-transparent hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
          Clear all
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setSelected(new Set(Object.keys(TEMPLATES)))}>
          Select all
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">
          {selected.size} template{selected.size !== 1 ? "s" : ""} selected
        </span>
      </div>

      {output ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">.gitignore</span>
            <CopyButton value={output} label="" />
          </div>
          <pre className="max-h-[480px] overflow-auto rounded-md border border-border bg-card px-3 py-2 font-mono text-xs">
            {output}
          </pre>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Select at least one template above.</p>
      )}
    </div>
  );
}
