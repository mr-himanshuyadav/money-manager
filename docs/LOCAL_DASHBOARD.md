# Local Money Manager Dashboard

The repository includes a local React + Vite dashboard and an Express bridge to the Money Manager MCP tools.

## Requirements

- Node.js 22.13 or newer
- Money Manager's **PC Manager** server running on your phone
- Your phone and computer connected to the same Wi-Fi network

## Start the dashboard

From the repository root:

```bash
npm install
npm install --prefix web
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://127.0.0.1:5173`).

## Connect to your phone

1. Open Money Manager on Android.
2. Start **More → PC Manager → Start**.
3. Enter the full address shown by the app in the dashboard's initial connection form, including the scheme and port. Example: `http://192.168.1.100:8888`.
4. Select **Connect and save**. The dashboard tests the address against the Money Manager API before saving it.
5. To update a changed IP or port later, edit **Money Manager server** in the dashboard header and select **Save address**.

The dashboard stores this setting locally in `.money-manager-connection.json`. That file is ignored by Git and is not pushed to GitHub. The dashboard's server address no longer needs to be stored in `.env`. Other environment variables may still be used for the MCP server's configuration.

Session cookies are stored in endpoint-specific, Git-ignored files so changing the phone address does not reuse a previous endpoint's session.

## Safety and troubleshooting

- The Express bridge listens only on `127.0.0.1`; it is intended for the local computer.
- If connection testing fails, verify that PC Manager is running, the phone and computer are on the same Wi-Fi, and the address includes the correct port.
- The dashboard does not save an address that fails its initialization request. A failed change leaves the previously saved address and active client unchanged.
- Do not commit `.env`, local connection files, session cookies, or exported financial data.

## Dashboard workspaces

- **Overview** — financial position, cash flow, and asset trend.
- **Transactions** — create, review, edit, and delete income and expense records.
- **Accounts** — review account groups and balances, and manage accounts.
- **Transfers** — move money between two different accounts and review transfer history for the selected date range. Editing a transfer may create a new transfer ID because of the upstream Money Manager API behaviour; the dashboard shows this warning before saving.

These actions update your connected Money Manager data. Check the selected accounts and amount before recording a transfer, and use delete actions carefully.
