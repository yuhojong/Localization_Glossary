const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { execSync, spawn } = require("child_process");

const rootDir = path.join(__dirname, "..");
const packageJsonPath = path.join(__dirname, "..", "package.json");
const releaseStatePath = path.join(rootDir, ".release-state.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const packageVersion = packageJson.version;

function readReleaseState() {
  try {
    return JSON.parse(fs.readFileSync(releaseStatePath, "utf8"));
  } catch (_error) {
    return null;
  }
}

function writeReleaseState(state) {
  fs.writeFileSync(releaseStatePath, JSON.stringify(state, null, 2) + "\n", "utf8");
}

function getGitMetadata() {
  try {
    const head = execSync("git rev-parse --short HEAD", {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "ignore"]
    })
      .toString("utf8")
      .trim();

    const commitMessage = execSync("git log -1 --pretty=%s", {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "ignore"]
    })
      .toString("utf8")
      .trim();

    return {
      head,
      commitMessage
    };
  } catch (_error) {
    return {
      head: "unknown",
      commitMessage: "No git metadata available"
    };
  }
}

function printBuildContext(lastBuild) {
  console.log(`Package version: ${packageVersion}`);

  if (!lastBuild) {
    console.log("Last build: none\n");
    return;
  }

  console.log(
    `Last build: ${lastBuild.version} (${lastBuild.gitHead}) ${lastBuild.commitMessage}`
  );
  console.log(`Last built at: ${lastBuild.builtAt}\n`);
}

function isValidVersion(value) {
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value);
}

function askVersion(defaultVersion) {
  const cliArg = process.argv.slice(2).find((arg) => arg.startsWith("--app-version="));
  if (cliArg) {
    return Promise.resolve(cliArg.split("=")[1].trim());
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`Build version [default: ${defaultVersion}]: `, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultVersion);
    });
  });
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      stdio: "inherit",
      shell: process.platform === "win32"
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} exited with code ${code}`));
    });

    child.on("error", reject);
  });
}

async function main() {
  const lastBuild = readReleaseState();
  const defaultVersion = lastBuild?.version || packageVersion;
  printBuildContext(lastBuild);

  const version = await askVersion(defaultVersion);

  if (!isValidVersion(version)) {
    console.error(
      `Invalid version "${version}". Use semver like 0.1.1, 1.0.0-beta.1, or 2.3.0+build.7`
    );
    process.exit(1);
  }

  console.log(`\nBuilding Navi Localization Glossary ${version}\n`);

  await runCommand("npm", ["run", "build:renderer"]);
  await runCommand("npx", ["electron-builder", "--config.extraMetadata.version=" + version]);

  const git = getGitMetadata();
  const nextState = {
    version,
    gitHead: git.head,
    commitMessage: git.commitMessage,
    builtAt: new Date().toISOString()
  };
  writeReleaseState(nextState);

  console.log(
    `\nSaved release state: ${nextState.version} (${nextState.gitHead}) ${nextState.commitMessage}`
  );
}

main().catch((error) => {
  console.error(`\nRelease build failed: ${error.message}`);
  process.exit(1);
});
