#!/bin/bash
# Pizza Empire — Archive & export for App Store Connect.
#
# Prereq: your Apple ID (alpcanut@icloud.com) is added in Xcode under
#   Xcode ▸ Settings ▸ Accounts, and you know your 10-character Team ID
#   (App Store Connect ▸ Membership, or the Accounts pane in Xcode).
#
# Usage:
#   ./archive.sh <TEAM_ID>
#
# This produces build/PizzaEmpire.ipa, ready to upload with Transporter
# or `xcrun altool` / Xcode Organizer.
set -euo pipefail
cd "$(dirname "$0")"

TEAM_ID="${1:-}"
if [ -z "$TEAM_ID" ]; then
  echo "error: pass your Team ID, e.g.  ./archive.sh ABCDE12345"
  exit 1
fi

# Sync the bundled web game from the repo root, then regenerate the project.
./sync-web.sh
xcodegen generate

ARCHIVE_PATH="build/PizzaEmpire.xcarchive"
EXPORT_DIR="build/export"

echo "▸ Archiving…"
xcodebuild -project PizzaEmpire.xcodeproj \
  -scheme PizzaEmpire \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE_PATH" \
  -allowProvisioningUpdates \
  DEVELOPMENT_TEAM="$TEAM_ID" \
  archive

# Inject the team ID into a temp copy of ExportOptions.plist.
TMP_OPTS="$(mktemp)"
sed "s/__TEAM_ID__/$TEAM_ID/" ExportOptions.plist > "$TMP_OPTS"

echo "▸ Exporting signed .ipa…"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_DIR" \
  -exportOptionsPlist "$TMP_OPTS"

rm -f "$TMP_OPTS"
echo "✅ Done. IPA at: $EXPORT_DIR/"
ls -1 "$EXPORT_DIR"
