# QuorumVault Scripts

This directory contains automation scripts for building, testing, and running QuorumVault on Canton.

## Files

* `build.ps1` / `build.sh`: Builds the Daml contracts into `.daml/dist/quorumvault-0.1.0.dar` using `dpm build`.
* `test.ps1` / `test.sh`: Runs the Daml Script test suite (`daml/Test.daml`) using `dpm test`.
* `run-demo.ps1`: Executes the end-to-end LocalNet simulation script (`daml/Demo.daml`).
* `localnet/`: Contains Canton LocalNet configuration and startup helpers.

## Running Tests

On Windows PowerShell:
```powershell
.\scripts\test.ps1
```

On Linux/macOS Bash:
```bash
./scripts/test.sh
```

## Running Canton LocalNet

See `localnet/README.md` for instructions on initializing a local Canton multi-participant cluster.
