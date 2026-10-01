# Canton LocalNet Setup

This directory contains configuration and scripts for running a Canton LocalNet participant node with the HTTP JSON Ledger API.

## Requirements

* Canton Network Participant Node binary (`canton`) or Docker.
* Daml SDK 3.5.7

## Ports

* **Ledger API (gRPC)**: `localhost:5011`
* **Ledger JSON API (HTTP)**: `localhost:7575`
* **Admin API**: `localhost:5012`

## Starting LocalNet

```bash
# Using canton CLI
canton -c canton-local.conf --bootstrap localnet-init.canton
```

Or via PowerShell:
```powershell
.\start-localnet.ps1
```
