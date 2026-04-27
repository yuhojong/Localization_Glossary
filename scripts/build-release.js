const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { spawn } = require("child_process");

const packageJsonPath = path.join(__dirname, "..", "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const defaultVersion = packageJson.version;

function isValidVersion(value) {
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value);
}

function askVersion() {
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
      cwd: path.join(__dirname, ".."),
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
  const version = await askVersion();

  if (!isValidVersion(version)) {
    console.error(
      `Invalid version "${version}". Use semver like 0.1.1, 1.0.0-beta.1, or 2.3.0+build.7`
    );
    process.exit(1);
  }

  console.log(`\nBuilding Navi Localization Glossary ${version}\n`);

  await runCommand("npm", ["run", "build:renderer"]);
  await runCommand("npx", ["electron-builder", "--config.extraMetadata.version=" + version]);
}

main().catch((error) => {
  console.error(`\nRelease build failed: ${error.message}`);
  process.exit(1);
});
